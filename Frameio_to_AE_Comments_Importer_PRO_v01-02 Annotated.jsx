function isCompActive(curItem) { // Make sure a comp is the active item
    var compActive = false;
    if (curItem == null || !(curItem instanceof CompItem)) {
        alert("Please establish a comp as the active item and run the script again");
    } else {
        compActive = true;
    }
    return compActive;
}
//~
// GET XML DATA FROM FILE
function getMyXML() { // Open an XML file and read it in, return XML Object.
    try {
        var myFile = File.openDialog("Select a Frame.io xml file.", "Frame.io xml:*.fioxml");
        if (myFile) {
            myFile.open("r");   // open file read-only
            var fileContent = myFile.read();      // read file contents and store in variable
            myFile.close();     // close the file
            return new XML(fileContent); // make and return a new XML object out of the data read from file
        } else {
            alert("No file.");
            return false;
        }
    } catch (err) { alert("Oops. On line " + err.line + " of \"getMyXML()\" you got " + err.message); }
}
//~
// GET NEEDED ONE-SHOT DATA FROM XML AND RETURN AS OBJECT
function getOneShotData(myXML) {
    try {
        var osData = {};
        osData.name = myXML.file.@name.toString();
        //osData.tcFmt = myXML.file.timecode.@format.toString();
        osData.fps = myXML.file.format.@fps.toString();
        osData.dims = [parseInt(myXML.file.format.@width.toString()), parseInt(myXML.file.format.@height.toString())];
        return osData;
    } catch (err) { alert("Oops. On line " + err.line + " of \"getOneShotData()\" you got " + err.message); }
}
//~  
// GET COMMENTS INTO ARRAY
function getComments(commentXml) { // Get all comments and data into master array of arrays
    try {
        var myOuputArray = []; // Initialize master array
        var myCommentArray = []; // Initialize Comments array
        var anArray = []; // Initialize Annotations array
        var myComments = commentXml.elements(); // Get <comment> elements into collection
        var conCount = myComments.length(); // Count the number of comments
        for (c = 0; c < conCount; c++) { // Loop through comments
            var thisComment = myComments[c]; // Get single comment
            var cmtArray = getContent(thisComment, false);  // Initialize string contaimer for all formatted content for a single comment and replies, add comment string
            if (thisComment.replies != undefined) { // Check for replies
                var myReplies = thisComment.replies.elements(); // Collect reply elements intocollection
                var repCount = myReplies.length();
                for (r = 0; r < repCount; r++) {
                    var thisReply = myReplies[r]; // Get single reply
                    var repArray = getContent(thisReply, true); // Append replies to comment string
                    cmtArray[1] += "\n\n" + repArray[1];
                }
            }
            if (thisComment.annotation != undefined) { // if there are annotations for this comment
                var myDrawing = thisComment.annotation.drawingData.drawing; // get the xml of the annotations
                var drwCount = myDrawing.length(); // count the number of annotations
                for (d = 0; d < drwCount; d++) { // loop through annotations
                    var myPoints = myDrawing[d].point; // get the points for this drawing
                    var myX = myPoints.@x.toString(); // concatenate all x points into string
                    var myY = myPoints.@y.toString(); // concatenate all y points into string
                    var anTc = thisComment.@timestamp; // get the frame number where the annotation occurs
                    var lookArray = [anTc, myDrawing[d].@tool, myDrawing[d].@size, myDrawing[d].@color.toString()]; // create array with non-vertex shape info
                    var shapeArray = [lookArray]; // push data array into shape array
                    if (myX.search(/NaN/) === -1 && myY.search(/NaN/) === -1) { // only continue if no points are NaN
                        var pointsArray = []; // empty array for points
                        var ptCount = myPoints.length(); // count the number of points
                        for (pt = 0; pt < ptCount; pt++) { // loop through points
                            var myPtX = parseFloat(myPoints[pt].@x.toString()); // get and parse the x value of this point
                            var myPtY = parseFloat(myPoints[pt].@y.toString()); // get and parse the y value of this point
                            pointsArray.push([myPtX, myPtY]); // put the value pair into the points array
                        }
                        shapeArray.push(pointsArray); // push the points array into the shape array
                        anArray.push(shapeArray); // push this annotation into the master annotation array
                    }
                }
            }
            myCommentArray.push(cmtArray); // push comment into comment array
        }
        myOuputArray.push(myCommentArray); // push comment array into delivery array
        myOuputArray.push(anArray); // push annotations array into delivery array
        return myOuputArray;
    } catch (err) { alert("Oops. On line " + err.line + " of \"getComments()\" you got " + err.message); }
}
//~  
// HELPER TO REMOVE UNNEEDED LINE BREAKS
function manageNewlines(elem, reg, repl) {
    var doSearch = elem.search(reg);
    while (doSearch != -1) {
        elem = elem.replace(reg, repl);
        doSearch = elem.search(reg);
    }
    return elem
}
//~  
// HELPER TO GET CONTENTS FROM ELEMENTS
function getContent(xmElement, reps) {
    var repSpc = reps ? ["\n", "\t"] : ["", ""]; // Tabs and newlines if this is a reply
    var thisText = xmElement.text.toString(); // Get the text content
    var nlStripReg = /\n\n\n/;
    var fmtText = manageNewlines(thisText, nlStripReg, "\n\n");
    var crAt = parseInt(xmElement.@createdAt); // Get time created
    var modAt = parseInt(xmElement.@modifiedAt); //Get time modified
    var modTxt = (crAt === modAt) ? "" : " (Edited " + formatTimestamp(modAt) + ")"; // add text if the comment/reply was modified
    var tcode = reps ? "" : parseInt(xmElement.@timestamp) / parseFloat(projData.fps); // get the time in seconds where the comment occurs
    var cntString = ""; // container for content string
    if (reps) { // formatting if it's a reply
        cntString = "==> Reply by " + xmElement.user.@name + ", " + formatTimestamp(crAt) + modTxt + "\n" + fmtText;
    } else { // formatting if it isn't a reply
        cntString = fmtText + "\n" + "==> " + xmElement.user.@name + ", " + formatTimestamp(crAt) + modTxt;
    }
    return [tcode, cntString];
}
//~  
// ADD ANNOTATION SHAPES AND SHAPE LAYER
function addShapes(annArray) {
    var compDims = [myItem.width, myItem.height]; // Get dims of comp to scale and position vertices
    if (compDims[0] != projData.dims[0] || compDims[1] != projData.dims[1]) {
        alert("The comp dimensions (" + compDims[0] + "*" + compDims[1] + ") do not match the Frame.io dimensions (" + projData.dims[0] + "*" + projData.dims[1] + ").\nThe comp dimensions will be used to position annotations.\n")
    }
    var myArray = annArray; // copy annotation array generated before
    var xOff = myItem.width / 2; // divide in half for position offset
    var yOff = myItem.height / 2;
    var anCount = myArray.length; // get count of annotations
    var layer = myItem.layers.addShape(); // add shape layer
    layer.guideLayer = true; // make the shape layer a guide layer so it won't render
    layer.name = "Annotations"; // name the layer
    for (a = 0; a < anCount; a++) {
        var sShape = new Shape(); // create new blank shape
        var rawVerts = myArray[a][1]; // get vertices
        var annotFrm = parseInt(myArray[a][0][0]); // get the frame number where it occurs
        var annotTool = myArray[a][0][1]; // get the tool/shape type
        var annotSize = parseInt(myArray[a][0][2]) * 2; // get the stroke width, beef it up
        var annotColor = hexToRGBA(myArray[a][0][3]); // convert the color to rgba
        var vertCount = rawVerts.length; // get number of verts for loop
        var fmtVerts = []; // container array for formatted verts
        for (i = 0; i < vertCount; i++) { // loop through verts to convert for correct display
            var vert = rawVerts[i];
            var newX = (vert[0] * compDims[0]) - xOff;
            var newY = (vert[1] * compDims[1]) - yOff;
            fmtVerts.push([newX, newY]);
        }
        sShape.vertices = fmtVerts; // create shape path
        sShape.closed = true; // close shape
        var group = layer.content.addProperty("ADBE Vector Group"); // layer needs shape group
        group.name = annotTool + " at " + smpteFormat(annotFrm); // name it
        var pathGroup = group.content.addProperty("ADBE Vector Shape - Group"); // add the path group
        pathGroup.property("ADBE Vector Shape").setValue(sShape); // add the path to the group
        if (annotTool == "arrow") { // arrow is the only filled shape, so if this is an arrow, ad fill
            var fill = group.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill"); // add fill
            fill.property("ADBE Vector Fill Color").setValue(annotColor); // set fill color
        } else { // If it's not an arrow add a stroke
            var stroke =  group.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke"); // add stroke
            stroke.property("ADBE Vector Stroke Color").setValue(annotColor); // set stroke values
            stroke.property("ADBE Vector Stroke Width").setValue(annotSize);
        }
        
        myProperty = group.property("ADBE Vector Transform Group").opacity; // get opacity for manipulation
        var curTime = annotFrm/projData.fps;
        var firstFmOffset = 3/projData.fps
        myProperty.setValueAtTime(curTime - firstFmOffset, 0); // set opacity keyframes
        myProperty.setValueAtTime(curTime, 100);
        myProperty.setValueAtTime(curTime + 1, 0);
        myProperty.setInterpolationTypeAtKey(2, KeyframeInterpolationType.HOLD); // change last 2 keyframe types to hold
        myProperty.setInterpolationTypeAtKey(3, KeyframeInterpolationType.HOLD);
        
        var anMarker = new MarkerValue(annotTool);
        layer.property("Marker").setValueAtTime(curTime, anMarker);
    }
}
//~  
// HELPER TO FORMAT DATE AND TIME
function formatTimestamp(ts) {
    var d = new Date(ts);
    var fmtDate = d.toDateString().split(" ")[0] + " " + d.getMonth() + "/" + d.getDate() + "/" + d.getFullYear();
    var rHours = d.getHours();
    var dPart = "am";
    var rMins = d.getMinutes();
    var mins = (rMins < 10) ? "0" + rMins.toString() : rMins;
    if (rHours > 12) {
        rHours = rHours - 12;
        dPart = "pm";
    }
    fmtDate += " " + rHours + ":" + mins + dPart;
    return fmtDate;
}
//~  
// HELPER TO FORMAT frames as smpte timecode
function smpteFormat(curFrame) {
    var fps = parseFloat(projData.fps); // fps data
    var currentFrame = parseInt(curFrame); // frame number
    var FF = currentFrame % fps; 
    var seconds = (currentFrame - FF) / fps;
    var SS = seconds % 60;
    var minutes = (seconds - SS) / 60;
    var MM = minutes % 60;
    var HH = (minutes - MM) / 60;
    var timecode = [HH.toString(), MM.toString(), SS.toString(), Math.floor(FF).toString()];
    var tl = timecode.length;
    for (ti = 0; ti < tl; ti++) {
        var myTC = timecode[ti];
        myTC = (myTC.length < 2) ? "0" + myTC : myTC;
        timecode[ti] = myTC;
    } 
    var resultString = timecode.join(':');
    return resultString;
}
//~  
// HELPER TO CONVERT HEX TO RGBA
function hexToRGBA(hex) {
    var b16 = "0123456789ABCDEF"; // string index is value of hex character in base 10
    hexVal = hex.replace("#", ""); // strip hash character from string
    var rgbaArr = []; // Empty container array
    for (h = 0; h < 6; h++) { // loop through characters in hex string
        if (h % 2 === 0) { // do this action only on left character of each pair
            var t = b16.search(hexVal[h]) * 16; // get index of the character in string, this is its base 10 value, multiply by 16 to "move decimal place" right
            var o = b16.search(hexVal[h + 1]); // get index of the character in string, this is its base 10 value
            var c = (t + o)/255; // add to get final base 10 value, divide by 255 to make between 0-1
            rgbaArr.push(c.toFixed(5)); // oush into rgba array, limiting decimal places to 5
        }
    }
    rgbaArr.push(1); // push value for alpha (full opacity)
    return rgbaArr;
}

var inputXml = getMyXML();
var projData = getOneShotData(inputXml);
var cmtXml = inputXml.file.comments;
var allDataArray = getComments(cmtXml);
var masterArray = allDataArray[0];
var annotArray = allDataArray[1]; 

{
    app.beginUndoGroup("Comments"); // Create an undo group
    var myItem = app.project.activeItem;
    if (isCompActive(myItem) == true) {
        var myNull = myItem.layers.addNull(); // Add a null to hold the comments
        myNull.enabled = false;
        myNull.name = "Comments:  " + projData.name; //myTitle;
        var numComms = masterArray.length;
        for (i = 0; i < numComms; i++) { // Loop the master comment array
            var thisArray = masterArray[i]; // Make temp array from this element of Master array
            var numLines = thisArray.length; // Count elements in temp array
            var myMarker = new MarkerValue(thisArray[1]);
            myNull.property("Marker").setValueAtTime(thisArray[0], myMarker);
        }
        addShapes(annotArray);
    }
    // close the undo group
    app.endUndoGroup();
}


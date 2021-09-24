function isCompActive(curItem) {
    var compActive = false;
    if (curItem == null || !(curItem instanceof CompItem)) {
        alert("Please establish a comp as the active item and run the script again");
    } else {
        compActive = true;
    }
    return compActive;
}
function getMyXML() {
    try {
        var myFile = File.openDialog("Select a Frame.io xml file.", "Frame.io xml:*.fioxml");
        if (myFile) {
            myFile.open("r");
            var fileContent = myFile.read();
            myFile.close();
            return new XML(fileContent);
        } else {
            alert("No file.");
            return false;
        }
    } catch (err) { alert("Oops. On line " + err.line + " of \"getMyXML()\" you got " + err.message); }
}
function getOneShotData(myXML) {
    try {
        var osData = {};
        osData.name = myXML.file.@name.toString();
        osData.fps = myXML.file.format.@fps.toString();
        osData.dims = [parseInt(myXML.file.format.@width.toString()), parseInt(myXML.file.format.@height.toString())];
        return osData;
    } catch (err) { alert("Oops. On line " + err.line + " of \"getOneShotData()\" you got " + err.message); }
}
function getComments(commentXml) {
    try {
        var myOuputArray = [];
        var myCommentArray = [];
        var anArray = [];
        var myComments = commentXml.elements();
        var conCount = myComments.length();
        for (c = 0; c < conCount; c++) {
            var thisComment = myComments[c];
            var cmtArray = getContent(thisComment, false);
            if (thisComment.replies != undefined) {
                var myReplies = thisComment.replies.elements();
                var repCount = myReplies.length();
                for (r = 0; r < repCount; r++) {
                    var thisReply = myReplies[r];
                    var repArray = getContent(thisReply, true);
                    cmtArray[1] += "\n\n" + repArray[1];
                }
            }
            if (thisComment.annotation != undefined) { 
                var myDrawing = thisComment.annotation.drawingData.drawing;
                var drwCount = myDrawing.length();
                for (d = 0; d < drwCount; d++) {
                    var myPoints = myDrawing[d].point;
                    var myX = myPoints.@x.toString();
                    var myY = myPoints.@y.toString();
                    var anTc = thisComment.@timestamp;
                    var lookArray = [anTc, myDrawing[d].@tool, myDrawing[d].@size, myDrawing[d].@color.toString()];
                    var shapeArray = [lookArray];
                    if (myX.search(/NaN/) === -1 && myY.search(/NaN/) === -1) {
                        var pointsArray = [];
                        var ptCount = myPoints.length();
                        for (pt = 0; pt < ptCount; pt++) {
                            var myPtX = parseFloat(myPoints[pt].@x.toString());
                            var myPtY = parseFloat(myPoints[pt].@y.toString());
                            pointsArray.push([myPtX, myPtY]);
                        }
                        shapeArray.push(pointsArray);
                        anArray.push(shapeArray);
                    }
                }
            }
            myCommentArray.push(cmtArray);
        }
        myOuputArray.push(myCommentArray);
        myOuputArray.push(anArray);
        return myOuputArray;
    } catch (err) { alert("Oops. On line " + err.line + " of \"getComments()\" you got " + err.message); }
}
function manageNewlines(elem, reg, repl) {
    var doSearch = elem.search(reg);
    while (doSearch != -1) {
        elem = elem.replace(reg, repl);
        doSearch = elem.search(reg);
    }
    return elem
}
function getContent(xmElement, reps) {
    var repSpc = reps ? ["\n", "\t"] : ["", ""]; 
    var thisText = xmElement.text.toString(); 
    var nlStripReg = /\n\n\n/;
    var fmtText = manageNewlines(thisText, nlStripReg, "\n\n");
    var crAt = parseInt(xmElement.@createdAt); 
    var modAt = parseInt(xmElement.@modifiedAt); 
    var modTxt = (crAt === modAt) ? "" : " (Edited " + formatTimestamp(modAt) + ")"; 
    var tcode = reps ? "" : parseInt(xmElement.@timestamp) / parseFloat(projData.fps); 
    var cntString = ""; 
    if (reps) { 
        cntString = "==> Reply by " + xmElement.user.@name + ", " + formatTimestamp(crAt) + modTxt + "\n" + fmtText;
    } else { 
        cntString = fmtText + "\n" + "==> " + xmElement.user.@name + ", " + formatTimestamp(crAt) + modTxt;
    }
    return [tcode, cntString];
}
function addShapes(annArray) {
    var compDims = [myItem.width, myItem.height]; 
    if (compDims[0] != projData.dims[0] || compDims[1] != projData.dims[1]) {
        alert("The comp dimensions (" + compDims[0] + "*" + compDims[1] + ") do not match the Frame.io dimensions (" + projData.dims[0] + "*" + projData.dims[1] + ").\nThe comp dimensions will be used to position annotations.\n")
    }
    var myArray = annArray; 
    var xOff = myItem.width / 2; 
    var yOff = myItem.height / 2;
    var anCount = myArray.length; 
    var layer = myItem.layers.addShape(); 
    layer.guideLayer = true; 
    layer.name = "Annotations"; 
    for (a = 0; a < anCount; a++) {
        var sShape = new Shape(); 
        var rawVerts = myArray[a][1]; 
        var annotFrm = parseInt(myArray[a][0][0]); 
        var annotTool = myArray[a][0][1]; 
        var annotSize = parseInt(myArray[a][0][2]) * 2; 
        var annotColor = hexToRGBA(myArray[a][0][3]); 
        var vertCount = rawVerts.length; 
        var fmtVerts = []; 
        for (i = 0; i < vertCount; i++) { 
            var vert = rawVerts[i];
            var newX = (vert[0] * compDims[0]) - xOff;
            var newY = (vert[1] * compDims[1]) - yOff;
            fmtVerts.push([newX, newY]);
        }
        sShape.vertices = fmtVerts; 
        sShape.closed = true; 
        var group = layer.content.addProperty("ADBE Vector Group"); 
        group.name = annotTool + " at " + smpteFormat(annotFrm); 
        var pathGroup = group.content.addProperty("ADBE Vector Shape - Group"); 
        pathGroup.property("ADBE Vector Shape").setValue(sShape); 
        if (annotTool == "arrow") { 
            var fill = group.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill"); 
            fill.property("ADBE Vector Fill Color").setValue(annotColor); 
        } else { 
            var stroke =  group.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke"); 
            stroke.property("ADBE Vector Stroke Color").setValue(annotColor); 
            stroke.property("ADBE Vector Stroke Width").setValue(annotSize);
        }
        
        myProperty = group.property("ADBE Vector Transform Group").opacity; 
        var curTime = annotFrm/projData.fps;
        var firstFmOffset = 3/projData.fps
        myProperty.setValueAtTime(curTime - firstFmOffset, 0); 
        myProperty.setValueAtTime(curTime, 100);
        myProperty.setValueAtTime(curTime + 1, 0);
        myProperty.setInterpolationTypeAtKey(2, KeyframeInterpolationType.HOLD); 
        myProperty.setInterpolationTypeAtKey(3, KeyframeInterpolationType.HOLD);
        
        var anMarker = new MarkerValue(annotTool);
        layer.property("Marker").setValueAtTime(curTime, anMarker);
    }
}
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
function smpteFormat(curFrame) {
    var fps = parseFloat(projData.fps); 
    var currentFrame = parseInt(curFrame); 
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
function hexToRGBA(hex) {
    var b16 = "0123456789ABCDEF"; 
    hexVal = hex.replace("#", ""); 
    var rgbaArr = []; 
    for (h = 0; h < 6; h++) { 
        if (h % 2 === 0) { 
            var t = b16.search(hexVal[h]) * 16; 
            var o = b16.search(hexVal[h + 1]); 
            var c = (t + o)/255; 
            rgbaArr.push(c.toFixed(5)); 
        }
    }
    rgbaArr.push(1); 
    return rgbaArr;
}

var inputXml = getMyXML();
var projData = getOneShotData(inputXml);
var cmtXml = inputXml.file.comments;
var allDataArray = getComments(cmtXml);
var masterArray = allDataArray[0];
var annotArray = allDataArray[1]; 

{
    app.beginUndoGroup("Comments"); 
    var myItem = app.project.activeItem;
    if (isCompActive(myItem) == true) {
        var myNull = myItem.layers.addNull(); 
        myNull.enabled = false;
        myNull.name = "Comments:  " + projData.name; 
        var numComms = masterArray.length;
        for (i = 0; i < numComms; i++) { 
            var thisArray = masterArray[i]; 
            var numLines = thisArray.length; 
            var myMarker = new MarkerValue(thisArray[1]);
            myNull.property("Marker").setValueAtTime(thisArray[0], myMarker);
        }
        addShapes(annotArray);
    }
    app.endUndoGroup();
}
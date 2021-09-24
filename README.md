This project is an After Effects script for importing comments and annotations from Frame.io into an After Effects comp.

Frame.io has an extension that includes this functionality, but it is fairly heavy, and is not necessarily a good choice for After Effects users who only occasionally need to interact with Frame.io.

The script is written in Adobe Extendscript, which is a dialect of ECMAScript, I believe 262-3 (it is a very old version of ECMAScript, and doesn't support many of the modern, useful methods that current ECMAScript has.

The binaries folder contains binary exports of the script, which can be run from within After Effects just like the non-binary versions.

NOTES FOR USERS
The current version is only known to work on Windows. Development for Mac OS is underway.

To use, you must downoad the comments from Frame.io as an XML file. The download icon is an inbox with a down-arrow pointing into it, at the top of the comments sidebar. Click that icon, then select "Download as file", and choose XML. Save the file somewhere you will be able to find.

In After Effects, make sure there is a comp (probably use your original project and main comp). The Comp window or the Timeline must have focus for the script to run.

Go to File>Scripts>Run Script. Navigate to the location of the script file on your computer and select it, then click OK.

You'll be prompted to select a file with the extension "fioxml". Navigate to the location where you stored the file you dowloaded from Frame.io and select it, then click OK.

The script will create a null in your com, and the comments will all be on that null as markers, at the correct timecode.

If there are annotations, they will be loaded onto a new Shape layer ath the correct time points, with markers indicating their location in time.

The Comments null has its visibility switch off (so you don't see the rectangle in the comp window) and the Shape layer is set to be a guide layer, si it will not be rendered if you forget to turn it off beofre rendering. If you want to rnder the annotations, make  the layer a regular layer instead of a guidelayer.

You can change the label color for individual comments. I typically change finished issues to green, ones where I have questions or issues to yellow, ones that can't be done to red, and ones that don't fit the previous categores to purple. You can come up with your own color scheme for your needs.

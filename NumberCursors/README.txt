Number Cursors 4 for Windows

The set includes 17 cursors in #CCCCCC on transparent backgrounds, with
32, 48, and 64 px versions. Open preview.png to see the cursor assignments
and their actual size at 32 px. The wait-preview.png and working-preview.png
files show the animation frames.

Install the full scheme

1. Right-click the downloaded ZIP, choose Properties, and select Unblock
   if it appears. Extract the ZIP and open the Windows folder in a terminal.
2. Run this command to register the scheme for your Windows account.

   powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\Register-Scheme.ps1

3. Press Win+R, enter main.cpl, and open the Pointers tab. In the Scheme
   menu, select Number Cursors v4 (#CCCCCC) and click Apply.

The script copies the cursors to %LOCALAPPDATA%\NumberCursors\CCCCCC-v4.

Set individual cursors

In the Pointers tab, select a role and click Browse. Choose the matching
file from the cursors folder and click Apply when finished.

Windows role             File              Design
Normal Select            Arrow.cur         Angled 4
Help Select              Help.cur          Angled 4 with a thin 2
Working in Background    AppStarting.ani   Angled 4 with a small rotating 6 and 9
Busy                     Wait.ani          Rotating 6 and 9
Precision Select         Crosshair.cur     Simple 8
Text Select              IBeam.cur         Thin 1
Handwriting              NWPen.cur         1 tilted like a pencil
Unavailable              No.cur            0 with a diagonal slash through its center
Vertical Resize          SizeNS.cur        Two 7s pointing up and down
Horizontal Resize        SizeWE.cur        Two 7s pointing left and right
Diagonal Resize 1        SizeNWSE.cur      Two 7s pointing upper left and lower right
Diagonal Resize 2        SizeNESW.cur      Two 7s pointing upper right and lower left
Move                     SizeAll.cur       Four 7s pointing in four directions
Alternate Select         UpArrow.cur       Upward-pointing 7
Link Select              Hand.cur          Upright 4
Location Select          Pin.cur           Upright 4 with a small 3 at the lower right
Person Select            Person.cur        Upright 4 with a small 5 at the lower right

For macOS and Linux setup, choose your OS at https://31916.ch/IdeaDesigns/#setup.

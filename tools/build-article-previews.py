"""Crop actual Google Workspace screenshots without redrawing or rescaling them."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / 'google-forms-profile/screenshots'
CROPS = {
    '01-resume-template': (625, 178, 1183, 690),
    '02-spreadsheet-settings': (40, 248, 688, 337),
    '03-open-apps-script': (305, 28, 738, 260),
    '04-run-setup': (300, 55, 1300, 710),
    '04b-created-trigger': (600, 170, 1640, 255),
    '05-created-form': (520, 65, 1375, 795),
    '06-form-submitted': (590, 0, 1270, 285),
    '07-response-status': None,
    '08-generated-resume': (625, 178, 1183, 750),
    '09-output-folder': (270, 70, 1040, 465),
    '10-gmail-received': (0, 0, 710, 375),
}

if __name__ == '__main__':
    destination = SCREENSHOTS / 'previews'
    destination.mkdir(exist_ok=True)
    for name, bounds in CROPS.items():
        with Image.open(SCREENSHOTS / (name + '.jpg')) as original:
            cropped = original.crop(bounds) if bounds else original.copy()
            cropped.save(destination / (name + '.webp'), lossless=True, method=6)

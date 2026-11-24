import importlib.util
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('apk_verify', ROOT / 'tools/verify_android_apk.py')
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)


def dex(defined, referenced=()):
    names = sorted(set(defined) | set(referenced))
    string_offset = 112
    type_offset = string_offset + 4 * len(names)
    class_offset = type_offset + 4 * len(names)
    data = bytearray(class_offset + 32 * len(defined))
    data[:8] = b'dex\n035\x00'
    struct.pack_into('<4I', data, 56, len(names), string_offset, len(names), type_offset)
    struct.pack_into('<2I', data, 96, len(defined), class_offset)
    for index, name in enumerate(names):
        struct.pack_into('<I', data, string_offset + 4 * index, len(data))
        struct.pack_into('<I', data, type_offset + 4 * index, index)
        encoded = name.encode()
        assert len(encoded) < 128
        data.extend(bytes([len(encoded)]) + encoded + b'\x00')
    for index, name in enumerate(defined):
        struct.pack_into('<I', data, class_offset + 32 * index, names.index(name))
    return data


class BuildChecks(unittest.TestCase):
    def setUp(self):
        self.temp = Path(tempfile.mkdtemp(prefix='apk-update-test-', dir=ROOT / '_tmp')).resolve()
        assert self.temp.is_relative_to((ROOT / '_tmp').resolve())

    def apk(self, defined, referenced=(), appid='H5C498173'):
        file = self.temp / 'fixture.apk'
        with zipfile.ZipFile(file, 'w') as z:
            z.writestr('classes.dex', dex(defined, referenced))
            z.writestr('assets/apps/H5C498173/www/manifest.json', json.dumps({'id': appid, 'version': {'name': '1.63.318'}}))
        return file

    def test_required_classes_are_defined(self):
        self.assertTrue(verify.verify(self.apk(sorted(verify.REQUIRED)))['zip4jDefined'])

    def test_reference_is_not_a_definition(self):
        missing = 'Lnet/lingala/zip4j/ZipFile;'
        with self.assertRaisesRegex(ValueError, 'APK missing runtime classes'):
            verify.verify(self.apk(sorted(verify.REQUIRED - {missing}), [missing]))

    def test_native_module_is_required(self):
        with self.assertRaisesRegex(ValueError, 'GuardReceipt'):
            verify.verify(self.apk(sorted(verify.REQUIRED - {'Lcom/guyu/guard/GuardReceipt;'})))

    def test_wrong_appid_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'application ID'):
            verify.verify(self.apk(sorted(verify.REQUIRED), appid='OTHER'))

    def test_gradle_patch_adds_dependency_once(self):
        sdk = self.temp / 'simpleDemo'
        sdk.mkdir()
        (sdk / 'build.gradle').write_text('android { defaultConfig { applicationId "sample"\nversionCode 1\nversionName "1.0" } }\ndependencies {}', encoding='utf-8')
        data = sdk / 'src/main/assets/data'
        data.mkdir(parents=True)
        (data / 'dcloud_control.xml').write_text('<hbuilder><apps><app appid="SAMPLE" appver=""/></apps></hbuilder>', encoding='utf-8')
        (data / 'dcloud_properties.xml').write_text('<properties><features></features></properties>', encoding='utf-8')
        (sdk / 'src/main/AndroidManifest.xml').write_text('<manifest><application></application></manifest>', encoding='utf-8')
        cmd = [sys.executable, str(ROOT / 'android-build/patch.py'), str(sdk), 'H5C498173', 'plus.H5C498173', 'test-only-key']
        for _ in range(2):
            result = subprocess.run(cmd, cwd=ROOT, capture_output=True, env={**__import__('os').environ, 'PYTHONIOENCODING': 'utf-8'})
            self.assertEqual(result.returncode, 0, result.stderr.decode(errors='replace'))
        text = (sdk / 'build.gradle').read_text(encoding='utf-8')
        self.assertEqual(text.count('net.lingala.zip4j:zip4j:2.11.5'), 1)
        self.assertIn('versionCode 163', text)

    def test_old_delivered_apk_exposes_the_missing_dependency(self):
        old = ROOT / '_tmp/delivery/guyu-1.62.apk'
        if not old.exists():
            self.skipTest('Previously delivered APK is not present on this machine')
        with self.assertRaisesRegex(ValueError, 'Lnet/lingala/zip4j/ZipFile;'):
            verify.verify(old)


if __name__ == '__main__':
    unittest.main(verbosity=2)

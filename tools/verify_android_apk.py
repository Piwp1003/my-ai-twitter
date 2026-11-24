"""Inspect DEX class definitions, not mere string references, before shipping an APK."""
import json
import struct
import sys
import zipfile
from pathlib import Path


def dex_classes(data):
    if data[:4] != b'dex\x0a':
        raise ValueError('Unsupported DEX header')
    string_count, string_offset, type_count, type_offset = struct.unpack_from('<4I', data, 56)
    class_count, class_offset = struct.unpack_from('<2I', data, 96)

    def string(index):
        if index >= string_count:
            raise ValueError('Invalid DEX string index')
        offset = struct.unpack_from('<I', data, string_offset + 4 * index)[0]
        while data[offset] & 128:
            offset += 1
        offset += 1
        return data[offset:data.index(0, offset)].decode('utf-8', errors='replace')

    found = set()
    for index in range(class_count):
        type_index = struct.unpack_from('<I', data, class_offset + 32 * index)[0]
        if type_index >= type_count:
            raise ValueError('Invalid DEX type index')
        found.add(string(struct.unpack_from('<I', data, type_offset + 4 * type_index)[0]))
    return found


REQUIRED = {
    'Lnet/lingala/zip4j/ZipFile;',
    'Lnet/lingala/zip4j/exception/ZipException;',
    'Lio/dcloud/common/util/Zip4JUtil;',
    'Lcom/guyu/guard/Guard;',
    'Lcom/guyu/guard/GuardReceipt;',
}


def verify(file):
    with zipfile.ZipFile(file) as archive:
        classes = set()
        for name in archive.namelist():
            if name.endswith('.dex'):
                classes.update(dex_classes(archive.read(name)))
        missing = REQUIRED - classes
        if missing:
            raise ValueError('APK missing runtime classes: ' + ', '.join(sorted(missing)))
        manifest = json.loads(archive.read('assets/apps/H5C498173/www/manifest.json'))
        if manifest.get('id') != 'H5C498173':
            raise ValueError('Unexpected WGT application ID')
        return {'apk': str(file), 'resourceVersion': manifest['version']['name'],
                'zip4jDefined': True, 'requiredNativeClassesDefined': True}


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit('Usage: python tools/verify_android_apk.py APK...')
    for name in sys.argv[1:]:
        print(json.dumps(verify(Path(name)), ensure_ascii=False))

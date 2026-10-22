# 让 release / debug 都用仓库保密设置里的证书签名（证书文件已解到 simpleDemo/guyu.keystore）
# 在 build.gradle 末尾再加一个 android {} 块：Groovy 会合并，后写的覆盖前面的
import sys, pathlib
p = pathlib.Path(sys.argv[1])
p.write_text(p.read_text(encoding='utf-8') + '''
android {
    signingConfigs {
        guyu {
            storeFile file('guyu.keystore')
            storePassword System.getenv('KEYSTORE_PASS')
            keyAlias System.getenv('KEY_ALIAS') ?: 'h5c498173'
            keyPassword System.getenv('KEY_PASS') ?: System.getenv('KEYSTORE_PASS')
        }
    }
    buildTypes {
        release { signingConfig signingConfigs.guyu }
        debug { signingConfig signingConfigs.guyu }
    }
}
''', encoding='utf-8')
print('签名改成 guyu.keystore')

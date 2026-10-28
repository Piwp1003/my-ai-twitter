/* =====================================================================
   js/95 —— 🔄 插件自动检查更新
   ---------------------------------------------------------------------
   网页托管（GitHub Pages 之类）更新了，**已经导入的插件不会跟着变**：
   插件代码存在每台设备自己的浏览器里，导入那一刻是什么版本就一直是什么版本。
   以前只能每台设备、每次更新都手动再导入一遍「新玩法全家桶.json」。

   现在：网页打开几秒后，悄悄去同一个网站上读一眼「插件/新玩法/新玩法全家桶.json」，
     · 你装过的插件，网站上的代码变了 → 算"有更新"
     · 你装过全家桶里的插件、但网站上多了新的合集 → 算"新增"
   有的话问你一句，点「更新」就覆盖（保留你的开关状态），然后刷新一次生效。
   你点了「先不」，同一批更新不会再问；插件页里随时能手动点「🔄 检查插件更新」。

   ⚠️ 直接双击 index.html 打开（file://）的时候浏览器不让读本地文件，这时不检查，导入一次就行。
   ===================================================================== */
(function () {
    if (window.__gyPlgUpd) return; window.__gyPlgUpd = 1;
    const URL_ = './插件/新玩法/新玩法全家桶.json';
    const URLS = [URL_];   // 📱 软件 10/28 起内置在本体里，不用再查
    const K_AUTO = 'gyPlgAutoUpd', K_SKIP = 'gyPlgUpdSkip';
    const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
    const autoOn = () => ls(K_AUTO) !== '0';
    const toast = (a, b) => { try { showToast('<div class="avatar" style="width:40px;height:40px;background:#1d9bf0;color:#fff;font-size:20px;">🔄</div>', a, b || '', null, null, false); } catch (e) {} };
    const P = () => (typeof plugins !== 'undefined' && Array.isArray(plugins)) ? plugins : [];
    const key = s => String(s || '').trim();
    const hash = s => { let h = 0; s = String(s || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h.toString(36); };

    async function fetchOne(u) {
        const r = await fetch(u + '?fresh=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        return (Array.isArray(j) ? j : [j]).filter(p => p && p.name && p.type);
    }
    // 返回一组一组的：每个全家桶一组（装过这组里的东西，这组多出来的才算"新增"）
    async function fetchRemote() {
        const out = [await fetchOne(URLS[0])];
        for (const u of URLS.slice(1)) { try { out.push(await fetchOne(u)); } catch (e) {} }
        return out;
    }
    function diff(groups) {
        const mine = P(), upd = [], add = [];
        groups.forEach(remote => {
            const haveAny = remote.some(p => mine.some(m => key(m.name) === key(p.name)));
            remote.forEach(p => {
                const old = mine.find(m => key(m.name) === key(p.name));
                if (old) { if ((old.onLoad || '') !== (p.onLoad || '') || (old.code || '') !== (p.code || '')) upd.push(p); }
                else if (haveAny) add.push(p);
            });
        });
        return { upd, add, sig: hash(upd.concat(add).map(p => p.name + (p.onLoad || '').length + hash(p.onLoad)).join('|')) };
    }
    function apply(d) {
        const mine = P();
        d.upd.forEach(p => { const old = mine.find(m => key(m.name) === key(p.name)); if (!old) return; const keep = { id: old.id, enabled: old.enabled, scope: old.scope }; Object.keys(old).forEach(k => delete old[k]); Object.assign(old, p, keep, { updatedAt: Date.now() }); });
        d.add.forEach(p => mine.push(Object.assign({}, p, { id: 'plg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), enabled: p.enabled !== false })));
        try { saveAllData(); } catch (e) {}
    }
    // manual=true：你自己点的按钮，结果都要告诉你；false：开机自动查，没更新就安安静静
    window.gyPluginUpdateCheck = async function (manual) {
        if (!/^https?:$/.test(location.protocol)) { if (manual) toast('这样打开的页面没法自动检查', '直接双击打开的网页读不到插件文件——去插件页导入一次「新玩法全家桶.json」就是最新的。'); return null; }
        let remote; try { remote = await fetchRemote(); } catch (e) { if (manual) toast('没查到', '网站上找不到「插件/新玩法/新玩法全家桶.json」，或者网络不通。'); return null; }
        const d = diff(remote);
        if (!d.upd.length && !d.add.length) { if (manual) toast('插件都是最新的', ['不用更新～', '已经是最新版了。', '没有新东西。'][Math.floor(Math.random() * 3)]); return d; }
        if (!manual && ls(K_SKIP) === d.sig) return d;
        const names = d.upd.concat(d.add).map(p => p.name).slice(0, 8).join('、') + (d.upd.length + d.add.length > 8 ? ' 等' : '');
        const msg = `插件有新版本：${d.upd.length ? `更新 ${d.upd.length} 个` : ''}${d.upd.length && d.add.length ? '，' : ''}${d.add.length ? `新增 ${d.add.length} 个` : ''}\n（${names}）\n\n现在更新吗？你的开关和数据都不会动，更新完刷新一次就生效。`;
        let ok = false; try { ok = typeof appConfirm === 'function' ? await appConfirm(msg) : confirm(msg); } catch (e) {}
        if (!ok) { ls(K_SKIP, d.sig); if (manual) toast('先不更新', '想更新的时候，插件页里点「🔄 检查插件更新」。'); return d; }
        apply(d); toast('插件更新好了', '马上刷新一下……'); window.__gyPlgUpdApplied = d;
        if (!window.__gyPlgNoReload) setTimeout(() => location.reload(), 800);
        return d;
    };
    window.gyPluginAutoUpdate = v => { ls(K_AUTO, v ? '1' : '0'); };
    // 插件页里放一个按钮 + 开关
    setInterval(() => {
        const list = document.getElementById('pluginsList'); if (!list || document.getElementById('gyPlgUpdBar')) return;
        const bar = document.createElement('div'); bar.id = 'gyPlgUpdBar';
        bar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 12px;font-size:13px;color:#536471;';
        bar.innerHTML = `<button type="button" class="btn-secondary" style="width:auto;padding:6px 14px;margin:0;" onclick="gyPluginUpdateCheck(true)">🔄 检查插件更新</button><label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" ${autoOn() ? 'checked' : ''} onchange="gyPluginAutoUpdate(this.checked)"> 打开网页时自动检查（网站上更新了插件就提醒我）</label>`;
        list.parentNode.insertBefore(bar, list);
    }, 1500);
    // 开机自动查一次（等别的都加载完，不跟开机抢网络）
    setTimeout(() => { if (autoOn() && P().length) window.gyPluginUpdateCheck(false); }, 8000);
})();

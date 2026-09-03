/* =====================================================================
   js/19 —— 派对类小游戏（原来是 4 个插件，v92 起内置）
   狼人杀 / 谁是卧底 / 20个问题 / 真心话大冒险

   前两个要群聊（狼人杀至少 3 个角色，谁是卧底至少 2 个），
   后两个私聊就能玩。同样每个一个 IIFE，理由见 js/18 顶部。
   ===================================================================== */

// ============ 狼人杀 ============
(function () {
  if (window.__werewolfPluginInstalled) return;
  window.__werewolfPluginInstalled = true;

  const STORE_KEY = 'werewolfGamesV1';
  function loadStore() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { return {}; } }
  function saveStore(obj) { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); }
  function getGame(sessionId) { return loadStore()[sessionId] || null; }
  function setGame(sessionId, game) {
    const all = loadStore();
    if (game) all[sessionId] = game; else delete all[sessionId];
    saveStore(all);
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function playerName(p) { if (!p) return '未知'; if (p.id === 'user') return (typeof currentUser !== 'undefined' && currentUser && currentUser.name) ? currentUser.name : '你'; const c = myCharacters.find(x => x.id == p.id); return c ? c.name : '未知'; }
  const ROLE_LABEL = { villager: '村民', werewolf: '狼人', seer: '预言家' };

  // ---------- 分配身份 ----------
  function assignRoles(allIds) {
    const total = allIds.length;
    const werewolfCount = Math.max(1, Math.floor(total / 3));
    const hasSeer = total >= 4;
    const shuffled = shuffle(allIds);
    const roles = {};
    for (let i = 0; i < werewolfCount; i++) roles[shuffled[i]] = 'werewolf';
    if (hasSeer) roles[shuffled[werewolfCount]] = 'seer';
    for (let i = werewolfCount + (hasSeer ? 1 : 0); i < total; i++) roles[shuffled[i]] = 'villager';
    return allIds.map(id => ({ id, role: roles[id], alive: true }));
  }

  function aliveOf(game, roleFilter) {
    return game.players.filter(p => p.alive && (!roleFilter || p.role === roleFilter));
  }
  function goodAlive(game) { return game.players.filter(p => p.alive && p.role !== 'werewolf'); }
  function wolfAlive(game) { return game.players.filter(p => p.alive && p.role === 'werewolf'); }

  // ---------- 开局 ----------
  async function startWerewolf(sessionId, opponentCharIds) {
    const chars = (opponentCharIds || []).map(id => myCharacters.find(c => c.id == id)).filter(Boolean);
    if (chars.length < 3) { alert('狼人杀至少需要3个角色一起玩（加上你总共4人），去群聊里凑够人数吧～'); return; }
    const allIds = ['user', ...chars.map(c => c.id)];
    const players = assignRoles(allIds);

    const game = {
      status: 'playing', players,
      phase: 'night', dayNum: 1,
      nightActions: { werewolfVotes: {}, seerTarget: null, seerResult: null },
      seerHistory: [],
      discussOrder: [], discussIndex: 0, discussions: [],
      dayVotes: {}, lastNightVictim: null, winner: null,
    };
    setGame(sessionId, game);

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'system', text: `🐺 狼人杀开局！${players.length}位玩家（${players.map(playerName).join('、')}），身份已经悄悄分配好（狼人：${wolfAlive(game).length}人，预言家：${aliveOf(game, 'seer').length}人，其余是村民）。天黑请闭眼...`, timestamp: Date.now() });
    renderChatMessages(); saveAllData();
    openWolfPanel(sessionId);
    await startNightPhase(sessionId);
  }

  function openWolfPanel(sessionId) {
    const panel = createMiniGameFloatingPanel('wolfFloatPanel', '🐺 狼人杀');
    panel.style.display = 'block';
    const body = panel.querySelector('.mini-game-float-body');
    if (!document.getElementById('wolfBody')) body.innerHTML = `<div id="wolfBody" style="max-width:320px;"></div>`;
    renderWolfPanel(sessionId);
  }

  // ---------- 夜晚阶段 ----------
  async function startNightPhase(sessionId) {
    let game = getGame(sessionId);
    game.phase = 'night';
    game.nightActions = { werewolfVotes: {}, seerTarget: null, seerResult: null };
    setGame(sessionId, game);
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'system', text: `🌙 第${game.dayNum}天夜晚降临，天黑请闭眼...`, timestamp: Date.now() });
    renderChatMessages(); saveAllData();
    renderWolfPanel(sessionId);

    const wolves = wolfAlive(game);
    const userIsWolf = wolves.some(p => p.id === 'user');
    for (const wolf of wolves) {
      if (wolf.id === 'user') continue; // 等用户自己在面板里选
      await runAiWerewolfVote(sessionId, wolf);
    }

    const seerAlive = aliveOf(getGame(sessionId), 'seer');
    const seer = seerAlive[0];
    if (seer && seer.id !== 'user') {
      await runAiSeerCheck(sessionId, seer);
    }

    renderWolfPanel(sessionId);
    await tryResolveNight(sessionId);
  }

  async function runAiWerewolfVote(sessionId, wolf) {
    let game = getGame(sessionId);
    const char = myCharacters.find(c => c.id == wolf.id);
    const api = getApiConfig(true);
    const targets = goodAlive(game); // 只能杀好人阵营
    if (targets.length === 0) return;
    const recentHistory = buildTimeAwareHistoryText(globalChats[sessionId].slice(-chatHistoryTurns));
    const targetNames = targets.map(playerName).join('、');
    const prompt = `${buildBasePrompt(char, true, recentHistory)}
你在玩狼人杀，你的身份是狼人（对外必须保密，白天讨论时要伪装成好人）。现在是夜晚，你和其他狼人同伴要选一个目标杀掉。
可以选择的目标（好人阵营存活玩家）：${targetNames}
请选择一个你要杀的目标。
只输出严格JSON，不要markdown代码块包裹：
{"target": "目标的名字，必须完全匹配上面列出的名字之一"}`;
    let targetId = null;
    try {
      const data = await callChatCompletionAPI(api, prompt);
      if (!data.error) {
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        const parsed = extractJsonObject(raw);
        if (parsed && parsed.target) { const t = targets.find(p => playerName(p) === parsed.target); if (t) targetId = t.id; }
      }
    } catch (e) {}
    if (!targetId) targetId = targets[Math.floor(Math.random() * targets.length)].id;
    game = getGame(sessionId);
    game.nightActions.werewolfVotes[wolf.id] = targetId;
    setGame(sessionId, game);
  }

  async function runAiSeerCheck(sessionId, seer) {
    let game = getGame(sessionId);
    const char = myCharacters.find(c => c.id == seer.id);
    const api = getApiConfig(true);
    const checkedIds = (game.seerHistory || []).map(h => h.targetId);
    const targets = game.players.filter(p => p.alive && p.id !== seer.id && !checkedIds.includes(p.id));
    const pool = targets.length > 0 ? targets : game.players.filter(p => p.alive && p.id !== seer.id);
    if (pool.length === 0) return;
    const recentHistory = buildTimeAwareHistoryText(globalChats[sessionId].slice(-chatHistoryTurns));
    const targetNames = pool.map(playerName).join('、');
    const prompt = `${buildBasePrompt(char, true, recentHistory)}
你在玩狼人杀，你的身份是预言家（对外必须保密）。现在是夜晚，你可以查验一名玩家的真实阵营（好人还是狼人）。
可以选择查验的目标：${targetNames}
请选择一个你要查验的目标。
只输出严格JSON，不要markdown代码块包裹：
{"target": "目标的名字，必须完全匹配上面列出的名字之一"}`;
    let targetId = null;
    try {
      const data = await callChatCompletionAPI(api, prompt);
      if (!data.error) {
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        const parsed = extractJsonObject(raw);
        if (parsed && parsed.target) { const t = pool.find(p => playerName(p) === parsed.target); if (t) targetId = t.id; }
      }
    } catch (e) {}
    if (!targetId) targetId = pool[Math.floor(Math.random() * pool.length)].id;
    game = getGame(sessionId);
    const target = game.players.find(p => p.id === targetId);
    const result = target.role === 'werewolf' ? 'werewolf' : 'good';
    game.seerHistory.push({ day: game.dayNum, targetId, result });
    game.nightActions.seerTarget = targetId;
    game.nightActions.seerResult = result;
    setGame(sessionId, game);
  }

  // ---------- 用户的夜晚操作 ----------
  async function submitNightWerewolfTarget(sessionId, targetId) {
    let game = getGame(sessionId);
    if (!game || game.phase !== 'night') return;
    const me = game.players.find(p => p.id === 'user');
    if (!me || me.role !== 'werewolf' || !me.alive) return;
    if (game.nightActions.werewolfVotes.user !== undefined) return;
    game.nightActions.werewolfVotes.user = targetId;
    setGame(sessionId, game);
    renderWolfPanel(sessionId);
    await tryResolveNight(sessionId);
  }
  window.__wolfSubmitWerewolfTarget = submitNightWerewolfTarget;

  async function submitNightSeerCheck(sessionId, targetId) {
    let game = getGame(sessionId);
    if (!game || game.phase !== 'night') return;
    const me = game.players.find(p => p.id === 'user');
    if (!me || me.role !== 'seer' || !me.alive) return;
    if (game.nightActions.seerTarget !== null) return;
    const target = game.players.find(p => p.id === targetId);
    const result = target.role === 'werewolf' ? 'werewolf' : 'good';
    game.nightActions.seerTarget = targetId;
    game.nightActions.seerResult = result;
    game.seerHistory.push({ day: game.dayNum, targetId, result });
    setGame(sessionId, game);
    renderWolfPanel(sessionId);
    await tryResolveNight(sessionId);
  }
  window.__wolfSubmitSeerCheck = submitNightSeerCheck;

  async function tryResolveNight(sessionId) {
    let game = getGame(sessionId);
    if (!game || game.phase !== 'night') return;
    const wolves = wolfAlive(game);
    const wolvesDone = wolves.every(w => game.nightActions.werewolfVotes[w.id] !== undefined);
    const seerAlive = aliveOf(game, 'seer')[0];
    const seerDone = !seerAlive || game.nightActions.seerTarget !== null || game.nightActions.seerResult !== null;
    if (wolvesDone && seerDone) await resolveNight(sessionId);
  }

  async function resolveNight(sessionId) {
    let game = getGame(sessionId);
    const tally = {};
    Object.values(game.nightActions.werewolfVotes).forEach(t => { tally[t] = (tally[t] || 0) + 1; });
    let maxVotes = -1, top = [];
    for (const pid of Object.keys(tally)) {
      if (tally[pid] > maxVotes) { maxVotes = tally[pid]; top = [pid]; }
      else if (tally[pid] === maxVotes) top.push(pid);
    }
    let victimId = top.length > 0 ? top[Math.floor(Math.random() * top.length)] : null;
    if (victimId) {
      const victim = game.players.find(p => p.id === victimId);
      victim.alive = false;
      game.lastNightVictim = victimId;
    } else {
      game.lastNightVictim = null;
    }
    setGame(sessionId, game);

    const winCheck = checkWinCondition(game);
    if (winCheck) { await finishWerewolf(sessionId, winCheck); return; }

    await startDayPhase(sessionId);
  }

  function checkWinCondition(game) {
    const wolves = wolfAlive(game);
    const goods = goodAlive(game);
    if (wolves.length === 0) return 'good';
    if (wolves.length >= goods.length) return 'werewolf';
    return null;
  }

  // ---------- 白天：宣布死讯 + 讨论 ----------
  async function startDayPhase(sessionId) {
    let game = getGame(sessionId);
    game.phase = 'day_discuss';
    game.discussions = [];
    const alive = game.players.filter(p => p.alive);
    game.discussOrder = shuffle(alive.map(p => p.id));
    game.discussIndex = 0;
    setGame(sessionId, game);

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    const victimText = game.lastNightVictim ? `昨晚 ${playerName(game.players.find(p => p.id === game.lastNightVictim))} 被杀害了。` : '昨晚是平安夜，没有人被杀。';
    globalChats[sessionId].push({ sender: 'system', text: `☀️ 第${game.dayNum}天天亮了。${victimText}现在开始自由讨论，请大家依次发言。`, timestamp: Date.now() });
    renderChatMessages(); saveAllData();
    renderWolfPanel(sessionId);
    await advanceDiscussion(sessionId);
  }

  async function advanceDiscussion(sessionId) {
    let game = getGame(sessionId);
    if (!game || game.status !== 'playing') return;
    if (game.discussIndex >= game.discussOrder.length) { await startDayVote(sessionId); return; }
    const pid = game.discussOrder[game.discussIndex];
    if (pid === 'user') { renderWolfPanel(sessionId); return; }

    const player = game.players.find(p => p.id === pid);
    const char = myCharacters.find(c => c.id == pid);
    const api = getApiConfig(true);
    const recentHistory = buildTimeAwareHistoryText(globalChats[sessionId].slice(-chatHistoryTurns));
    const discussSoFar = game.discussions.length > 0 ? game.discussions.map(d => `${playerName(game.players.find(p => p.id === d.by))}："${d.text}"`).join('；') : '（还没有人发言）';
    let roleContext = '';
    if (player.role === 'werewolf') {
      const wolfTeammates = wolfAlive(game).filter(w => w.id !== pid).map(playerName).join('、');
      roleContext = `你的身份是狼人（同伴：${wolfTeammates || '无'}），发言时要伪装成好人，可以带节奏、嫁祸给别人，绝对不能暴露自己是狼人。`;
    } else if (player.role === 'seer') {
      const myChecks = (game.seerHistory || []).filter(h => true).map(h => `${playerName(game.players.find(p => p.id === h.targetId))}是${h.result === 'werewolf' ? '狼人' : '好人'}`).join('，');
      roleContext = `你的身份是预言家，你目前查验过的结果：${myChecks || '还没查验过谁'}。你可以选择这一轮是否"跳身份"公布查验结果来带领好人阵营，也可以先观察局势再决定。`;
    } else {
      roleContext = `你的身份是村民，没有特殊能力，尽量通过大家的发言逻辑推理出谁是狼人。`;
    }
    const prompt = `${buildBasePrompt(char, true, recentHistory)}
你在玩狼人杀。${roleContext}
当前是第${game.dayNum}天白天讨论，到目前为止大家的发言：${discussSoFar}
请说一段你这一轮的发言（分析局势、怀疑某人、或为自己辩护等），符合你的人设语气，不超过60字。
只输出这段发言本身，不要markdown、不要多余说明。`;
    let text = '（想不出该说什么...）';
    try {
      const data = await callChatCompletionAPI(api, prompt);
      if (!data.error) {
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        if (raw) text = raw.replace(/^["「]|["」]$/g, '').trim();
      }
    } catch (e) {}

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: char.id, text, timestamp: Date.now(), readBy: [] });
    renderChatMessages(); saveAllData();

    game = getGame(sessionId);
    game.discussions.push({ by: pid, text });
    game.discussIndex++;
    setGame(sessionId, game);
    renderWolfPanel(sessionId);
    await advanceDiscussion(sessionId);
  }

  function submitUserDiscussion(sessionId) {
    const input = document.getElementById('wolfDiscussInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) { alert('说点什么吧～'); return; }
    let game = getGame(sessionId);
    if (!game || game.phase !== 'day_discuss' || game.discussOrder[game.discussIndex] !== 'user') return;

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'me', text, timestamp: Date.now(), readBy: [] });
    renderChatMessages(); saveAllData();

    game.discussions.push({ by: 'user', text });
    game.discussIndex++;
    setGame(sessionId, game);
    renderWolfPanel(sessionId);
    advanceDiscussion(sessionId);
  }
  window.__wolfSubmitDiscussion = submitUserDiscussion;

  // ---------- 白天投票放逐 ----------
  async function startDayVote(sessionId) {
    let game = getGame(sessionId);
    game.phase = 'day_vote';
    game.dayVotes = {};
    setGame(sessionId, game);
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'system', text: `🗳️ 讨论结束，开始投票放逐！`, timestamp: Date.now() });
    renderChatMessages(); saveAllData();
    renderWolfPanel(sessionId);

    const alive = game.players.filter(p => p.alive);
    for (const player of alive) {
      if (player.id === 'user') continue;
      await runAiDayVote(sessionId, player);
    }
    renderWolfPanel(sessionId);

    game = getGame(sessionId);
    const userPlayer = game.players.find(p => p.id === 'user');
    if (!userPlayer || !userPlayer.alive) { await resolveDayVote(sessionId); }
  }

  async function runAiDayVote(sessionId, player) {
    let game = getGame(sessionId);
    const char = myCharacters.find(c => c.id == player.id);
    const api = getApiConfig(true);
    const alive = game.players.filter(p => p.alive);
    const candidates = alive.filter(p => p.id !== player.id);
    if (candidates.length === 0) return;
    const discussText = game.discussions.map(d => `${playerName(game.players.find(p => p.id === d.by))}："${d.text}"`).join('；');
    const candidateNames = candidates.map(playerName).join('、');
    let roleContext = player.role === 'werewolf' ? `你的身份是狼人，投票时要避免票给同伴，尽量把票带向好人身上。` : `你的身份是${ROLE_LABEL[player.role]}，尽量投给你觉得最可疑的人。`;
    const prompt = `${buildBasePrompt(char, false, '')}
你在玩狼人杀。${roleContext}
本轮讨论内容：${discussText}
可以投票的对象：${candidateNames}
请选择一个你要投票放逐的对象。
只输出严格JSON，不要markdown代码块包裹：
{"vote": "你要投的那个人的名字，必须完全匹配上面列出的名字之一"}`;
    let voteTarget = null;
    try {
      const data = await callChatCompletionAPI(api, prompt);
      if (!data.error) {
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        const parsed = extractJsonObject(raw);
        if (parsed && parsed.vote) { const t = candidates.find(p => playerName(p) === parsed.vote); if (t) voteTarget = t.id; }
      }
    } catch (e) {}
    if (!voteTarget) voteTarget = candidates[Math.floor(Math.random() * candidates.length)].id;
    game = getGame(sessionId);
    game.dayVotes[player.id] = voteTarget;
    setGame(sessionId, game);
  }

  function submitUserDayVote(sessionId, targetId) {
    let game = getGame(sessionId);
    if (!game || game.phase !== 'day_vote') return;
    const me = game.players.find(p => p.id === 'user');
    if (!me || !me.alive) return;
    game.dayVotes.user = targetId;
    setGame(sessionId, game);
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'me', text: `【投票】放逐 ${playerName(game.players.find(p => p.id === targetId))}`, timestamp: Date.now(), readBy: [] });
    renderChatMessages(); saveAllData();
    renderWolfPanel(sessionId);
    resolveDayVote(sessionId);
  }
  window.__wolfSubmitDayVote = submitUserDayVote;

  async function resolveDayVote(sessionId) {
    let game = getGame(sessionId);
    const alive = game.players.filter(p => p.alive);
    if (Object.keys(game.dayVotes).length < alive.length) return;

    const tally = {};
    Object.values(game.dayVotes).forEach(t => { tally[t] = (tally[t] || 0) + 1; });
    let maxVotes = -1, top = [];
    for (const pid of Object.keys(tally)) {
      if (tally[pid] > maxVotes) { maxVotes = tally[pid]; top = [pid]; }
      else if (tally[pid] === maxVotes) top.push(pid);
    }
    const eliminatedId = top[Math.floor(Math.random() * top.length)];
    const eliminated = game.players.find(p => p.id === eliminatedId);
    eliminated.alive = false;

    const voteSummary = alive.map(p => {
      const votersFor = Object.keys(game.dayVotes).filter(voter => game.dayVotes[voter] === p.id).map(voter => playerName(game.players.find(x => x.id === voter)));
      return votersFor.length > 0 ? `${playerName(p)}(${votersFor.length}票)` : null;
    }).filter(Boolean).join('、');

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'system', text: `票数统计：${voteSummary}。${playerName(eliminated)} 被放逐，TA的真实身份是「${ROLE_LABEL[eliminated.role]}」！`, timestamp: Date.now() });
    renderChatMessages(); saveAllData();
    setGame(sessionId, game);
    renderWolfPanel(sessionId);

    const winCheck = checkWinCondition(game);
    if (winCheck) { await finishWerewolf(sessionId, winCheck); return; }

    game = getGame(sessionId);
    game.dayNum++;
    setGame(sessionId, game);
    await startNightPhase(sessionId);
  }

  // ---------- 结束游戏 ----------
  async function finishWerewolf(sessionId, winner) {
    let game = getGame(sessionId);
    game.status = 'finished';
    game.winner = winner;
    setGame(sessionId, game);

    const roleReveal = game.players.map(p => `${playerName(p)}(${ROLE_LABEL[p.role]}${p.alive ? '' : '·已死亡'})`).join('、');
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    const sysText = winner === 'good' ? `🎉 好人阵营获胜！所有狼人都被找出来了。` : `😈 狼人阵营获胜！狼人数量已经追平或超过好人。`;
    globalChats[sessionId].push({ sender: 'system', text: `${sysText}\n身份公布：${roleReveal}`, timestamp: Date.now() });
    renderChatMessages(); saveAllData();
    renderWolfPanel(sessionId);
    if (typeof refreshMiniGameIconBadge === 'function') refreshMiniGameIconBadge();

    for (const p of game.players) {
      if (p.id === 'user') continue;
      const char = myCharacters.find(c => c.id == p.id);
      if (!char) continue;
      const isWolf = p.role === 'werewolf';
      const won = (isWolf && winner === 'werewolf') || (!isWolf && winner === 'good');
      const resultText = won ? `你的身份是${ROLE_LABEL[p.role]}，这局你的阵营赢了` : `你的身份是${ROLE_LABEL[p.role]}，这局你的阵营输了`;
      await askCharGameEndComment(char, sessionId, '狼人杀', resultText);
    }
  }

  // ---------- 样式 ----------
  const wolfStyle = document.createElement('style');
  wolfStyle.textContent = `
    .wolf-status { text-align:center; font-weight:bold; color:#1d9bf0; margin-bottom:8px; }
    .wolf-role-box { text-align:center; background:var(--gy-game-box-bg); color:var(--gy-game-box-fg); padding:8px; border-radius:6px; margin-bottom:8px; font-size:13px; }
    .wolf-input { width:100%; box-sizing:border-box; padding:8px; border-radius:6px; border:1px solid #ccc; margin-top:4px; font-size:14px; }
    .wolf-action-btn { margin:3px; }
    .wolf-player-list { font-size:12px; color:#8b98a5; text-align:center; margin-bottom:6px; }
    .wolf-seer-log { font-size:12px; color:#f9a825; text-align:center; margin-top:6px; }
  `;
  document.head.appendChild(wolfStyle);

  function renderWolfPanel(sessionId) {
    const game = getGame(sessionId);
    const el = document.getElementById('wolfBody');
    if (!el || !game) return;
    const me = game.players.find(p => p.id === 'user');
    const myRole = me ? me.role : null;
    const myAlive = me ? me.alive : false;
    const playerListHtml = game.players.map(p => `${playerName(p)}${p.alive ? '' : '（已死亡）'}`).join('、');

    let statusText, bodyHtml = '';
    let seerLogHtml = '';
    if (myRole === 'seer' && game.seerHistory && game.seerHistory.length > 0) {
      seerLogHtml = `<div class="wolf-seer-log">🔮 你的查验记录：${game.seerHistory.map(h => `${playerName(game.players.find(p => p.id === h.targetId))}=${h.result === 'werewolf' ? '狼人' : '好人'}`).join('，')}</div>`;
    }

    if (game.status === 'finished') {
      statusText = game.winner === 'good' ? '🎉 好人阵营获胜！' : '😈 狼人阵营获胜！';
      bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px;">可以点游戏图标重新开一局～</div>`;
    } else if (!myAlive) {
      statusText = `第${game.dayNum}天 - ${game.phase === 'night' ? '夜晚' : game.phase === 'day_discuss' ? '讨论中' : '投票中'}`;
      bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px;">你已经出局了，正在旁观剩下的对局...</div>`;
    } else if (game.phase === 'night') {
      statusText = `第${game.dayNum}天夜晚`;
      if (myRole === 'werewolf') {
        const voted = game.nightActions.werewolfVotes.user !== undefined;
        if (voted) {
          bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px;">你已经选好目标，等待天亮...</div>`;
        } else {
          const targets = goodAlive(game);
          const btns = targets.map(p => `<button class="btn-edit-small wolf-action-btn" onclick="window.__wolfSubmitWerewolfTarget('${sessionId}','${p.id}')">${escapeHtml(playerName(p))}</button>`).join('');
          bodyHtml = `<div style="text-align:center; font-size:13px; margin-bottom:6px;">🐺 选择今晚要杀的目标：</div><div style="text-align:center;">${btns}</div>`;
        }
      } else if (myRole === 'seer') {
        const checked = game.nightActions.seerTarget !== null;
        if (checked) {
          bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px;">你已经查验过了，等待天亮...</div>`;
        } else {
          const targets = game.players.filter(p => p.alive && p.id !== 'user');
          const btns = targets.map(p => `<button class="btn-edit-small wolf-action-btn" onclick="window.__wolfSubmitSeerCheck('${sessionId}','${p.id}')">${escapeHtml(playerName(p))}</button>`).join('');
          bodyHtml = `<div style="text-align:center; font-size:13px; margin-bottom:6px;">🔮 选择今晚要查验的目标：</div><div style="text-align:center;">${btns}</div>`;
        }
      } else {
        bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px;">天黑请闭眼，等待天亮...</div>`;
      }
    } else if (game.phase === 'day_discuss') {
      const currentTurnId = game.discussOrder && game.discussOrder.length > 0 ? game.discussOrder[game.discussIndex] : null;
      const currentTurnPlayer = currentTurnId ? game.players.find(p => p.id === currentTurnId) : null;
      statusText = `第${game.dayNum}天白天讨论中`;
      if (!currentTurnPlayer) {
        bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px;">准备中...</div>`;
      } else if (currentTurnId === 'user') {
        bodyHtml = `<div style="text-align:center; font-size:13px; color:#f91880; margin-bottom:6px;">轮到你发言了！</div>
          <textarea class="wolf-input" id="wolfDiscussInput" rows="2" placeholder="说说你的看法..."></textarea>
          <div style="text-align:center; margin-top:6px;"><button class="btn-edit-small" onclick="window.__wolfSubmitDiscussion('${sessionId}')">发言</button></div>`;
      } else {
        bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px;">等待${escapeHtml(playerName(currentTurnPlayer))}发言...</div>`;
      }
    } else if (game.phase === 'day_vote') {
      const voted = game.dayVotes.user !== undefined;
      statusText = `第${game.dayNum}天投票中`;
      if (voted) {
        bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px;">你已投票，等待结果...</div>`;
      } else {
        const candidates = game.players.filter(p => p.alive && p.id !== 'user');
        const btns = candidates.map(p => `<button class="btn-edit-small wolf-action-btn" onclick="window.__wolfSubmitDayVote('${sessionId}','${p.id}')">${escapeHtml(playerName(p))}</button>`).join('');
        bodyHtml = `<div style="text-align:center; font-size:13px; margin-bottom:6px;">投票放逐谁？</div><div style="text-align:center;">${btns}</div>`;
      }
    }

    el.innerHTML = `
      <div class="wolf-status">${escapeHtml(statusText)}</div>
      ${me ? `<div class="wolf-role-box">你的身份是：<b>${ROLE_LABEL[myRole] || '未知'}</b>${myAlive ? '' : '（已出局）'}</div>` : ''}
      ${seerLogHtml}
      <div class="wolf-player-list">玩家：${escapeHtml(playerListHtml)}</div>
      ${bodyHtml}
      <div style="display:flex; justify-content:center; gap:10px; margin-top:14px;">
        <button class="btn-edit-small" onclick="document.getElementById('wolfFloatPanel').style.display='none'">收起（继续聊天）</button>
      </div>`;
  }

  // ---------- 注册进核心小游戏框架 ----------
  if (typeof registerMiniGame === 'function') {
    registerMiniGame({
      id: 'simplified_werewolf',
      name: '狼人杀',
      icon: '🐺',
      minOpponents: 3,
      getStatus: function (sessionId) { const g = getGame(sessionId); return g ? g.status : null; },
      onResume: function (sessionId) { openWolfPanel(sessionId); },
      onStart: function (sessionId, opponentCharIds) { startWerewolf(sessionId, opponentCharIds); }
    });
  } else {
    console.error('狼人杀插件：没有找到核心小游戏框架（registerMiniGame），请确认网页已经更新到支持小游戏框架的版本。');
  }
})();

// ============ 谁是卧底 ============
(function () {
  if (window.__undercoverPluginInstalled) return;
  window.__undercoverPluginInstalled = true;

  const STORE_KEY = 'undercoverGamesV1';
  function loadStore() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { return {}; } }
  function saveStore(obj) { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); }
  function getGame(sessionId) { return loadStore()[sessionId] || null; }
  function setGame(sessionId, game) {
    const all = loadStore();
    if (game) all[sessionId] = game; else delete all[sessionId];
    saveStore(all);
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function playerName(p) { if (p.id === 'user') return (typeof currentUser !== 'undefined' && currentUser && currentUser.name) ? currentUser.name : '你'; const c = myCharacters.find(x => x.id == p.id); return c ? c.name : '未知'; }

  // ---------- 开局：生成词对、分配身份 ----------
  async function startUndercover(sessionId, opponentCharIds) {
    const chars = (opponentCharIds || []).map(id => myCharacters.find(c => c.id == id)).filter(Boolean);
    if (chars.length < 2) { alert('谁是卧底至少需要2个角色一起玩，去群聊里凑够人数吧～'); return; }

    const api = getApiConfig(true);
    const wordPrompt = `请给"谁是卧底"这个游戏生成一对适合的词语：两个词要属于同一类别、有一定相似性，但又有明确区别，让大多数人拿到词A、少数人（卧底）拿到词B时，双方在描述时既可能蒙混过关也可能被识破（比如"苹果/梨"、"篮球/排球"、"老师/医生"这样的难度）。
只输出严格JSON，不要markdown代码块包裹：
{"wordA": "多数人的词", "wordB": "卧底的词"}`;
    let wordA = '苹果', wordB = '梨';
    try {
      const data = await callChatCompletionAPI(api, wordPrompt);
      if (!data.error) {
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        const parsed = extractJsonObject(raw);
        if (parsed && parsed.wordA && parsed.wordB) { wordA = parsed.wordA; wordB = parsed.wordB; }
      }
    } catch (e) {}

    const allIds = ['user', ...chars.map(c => c.id)];
    const undercoverId = allIds[Math.floor(Math.random() * allIds.length)];
    const players = allIds.map(id => ({ id, name: id === 'user' ? '你' : (myCharacters.find(c => c.id == id) || {}).name, word: id === undercoverId ? wordB : wordA, role: id === undercoverId ? 'undercover' : 'majority', alive: true }));

    const game = { status: 'playing', players, round: 1, phase: 'clue', clueOrder: [], clueIndex: 0, clues: [], votes: {}, winner: null };
    setGame(sessionId, game);

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'system', text: `🕵️ 谁是卧底开始！${players.length}位玩家（${players.map(playerName).join('、')}）各自拿到了一个词，其中混入了1名卧底。轮流用一句话描述自己的词（不能直接说出这个词），然后投票揪出卧底！`, timestamp: Date.now() });
    renderChatMessages(); saveAllData();
    openUcPanel(sessionId);
    await startClueRound(sessionId);
  }

  function openUcPanel(sessionId) {
    const panel = createMiniGameFloatingPanel('ucFloatPanel', '🕵️ 谁是卧底');
    panel.style.display = 'block';
    const body = panel.querySelector('.mini-game-float-body');
    if (!document.getElementById('ucBody')) body.innerHTML = `<div id="ucBody" style="max-width:320px;"></div>`;
    renderUcPanel(sessionId);
  }

  // ---------- 描述回合 ----------
  async function startClueRound(sessionId) {
    let game = getGame(sessionId);
    const alive = game.players.filter(p => p.alive);
    game.clueOrder = shuffle(alive.map(p => p.id));
    game.clueIndex = 0;
    game.clues = [];
    game.phase = 'clue';
    setGame(sessionId, game);
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'system', text: `📢 第${game.round}轮描述开始，顺序：${game.clueOrder.map(id => playerName(game.players.find(p => p.id === id))).join(' → ')}`, timestamp: Date.now() });
    renderChatMessages(); saveAllData();
    await advanceClue(sessionId);
  }

  async function advanceClue(sessionId) {
    let game = getGame(sessionId);
    if (!game || game.status !== 'playing') return;
    if (game.clueIndex >= game.clueOrder.length) { await startVotingRound(sessionId); return; }

    const pid = game.clueOrder[game.clueIndex];
    if (pid === 'user') { renderUcPanel(sessionId); return; }

    const player = game.players.find(p => p.id === pid);
    const char = myCharacters.find(c => c.id == pid);
    const api = getApiConfig(true);
    const recentHistory = buildTimeAwareHistoryText(globalChats[sessionId].slice(-chatHistoryTurns));
    const cluesSoFar = game.clues.length > 0 ? game.clues.map(c => `${playerName(game.players.find(p => p.id === c.by))}："${c.text}"`).join('；') : '（还没有人描述）';
    const prompt = `${buildBasePrompt(char, true, recentHistory)}
你在和其他人玩"谁是卧底"。你拿到的词是："${player.word}"（绝对不能直接说出这个词本身，也不要说出明显的谐音）。
到目前为止其他人的描述：${cluesSoFar}
请你用一句话描述你拿到的这个词的特征（不能说出词本身），要尽量贴合词义又不要过于直白暴露，也可以参考别人的描述风格来判断该更靠拢一致还是需要谨慎（如果你怀疑自己可能是卧底，可以适当模糊/跟随大家的描述方向）。
只输出这句描述本身，不要markdown、不要多余说明，不超过30字。`;
    let clueText = '（想不出该怎么形容...）';
    try {
      const data = await callChatCompletionAPI(api, prompt);
      if (!data.error) {
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        if (raw) clueText = raw.replace(/^["「]|["」]$/g, '').trim();
      }
    } catch (e) {}

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: char.id, text: clueText, timestamp: Date.now(), readBy: [] });
    renderChatMessages(); saveAllData();

    game = getGame(sessionId);
    game.clues.push({ by: pid, text: clueText });
    game.clueIndex++;
    setGame(sessionId, game);
    renderUcPanel(sessionId);
    await advanceClue(sessionId);
  }

  function submitUserClue(sessionId) {
    const input = document.getElementById('ucClueInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) { alert('描述点什么吧～'); return; }
    let game = getGame(sessionId);
    if (!game || game.phase !== 'clue' || game.clueOrder[game.clueIndex] !== 'user') return;

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'me', text, timestamp: Date.now(), readBy: [] });
    renderChatMessages(); saveAllData();

    game.clues.push({ by: 'user', text });
    game.clueIndex++;
    setGame(sessionId, game);
    renderUcPanel(sessionId);
    advanceClue(sessionId);
  }
  window.__ucSubmitClue = submitUserClue;

  // ---------- 投票回合 ----------
  async function startVotingRound(sessionId) {
    let game = getGame(sessionId);
    game.phase = 'voting';
    game.votes = {};
    setGame(sessionId, game);
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'system', text: `🗳️ 描述完毕，开始投票！请大家选出你认为最可疑的卧底。`, timestamp: Date.now() });
    renderChatMessages(); saveAllData();
    renderUcPanel(sessionId);

    // AI玩家先各自投票（同时进行，不受用户投票影响）
    const alive = game.players.filter(p => p.alive);
    for (const player of alive) {
      if (player.id === 'user') continue;
      const char = myCharacters.find(c => c.id == player.id);
      const api = getApiConfig(true);
      const cluesText = game.clues.map(c => `${playerName(game.players.find(p => p.id === c.by))}："${c.text}"`).join('；');
      const candidateNames = alive.filter(p => p.id !== player.id).map(p => playerName(p)).join('、');
      const prompt = `${buildBasePrompt(char, false, '')}
你在和其他人玩"谁是卧底"。你自己拿到的词是："${player.word}"，你的身份是${player.role === 'undercover' ? '卧底（你要尽量伪装，把怀疑引向别人）' : '普通人（你要通过大家的描述找出那个格格不入的卧底）'}。
本轮所有人的描述是：${cluesText}
可以投票怀疑的对象（不包括你自己）：${candidateNames}
请从这些人里选一个你要投票怀疑的对象。
只输出严格JSON，不要markdown代码块包裹：
{"vote": "你要投的那个人的名字，必须完全匹配上面列出的名字之一"}`;
      let voteTarget = null;
      try {
        const data = await callChatCompletionAPI(api, prompt);
        if (!data.error) {
          const raw = (data.choices?.[0]?.message?.content || '').trim();
          const parsed = extractJsonObject(raw);
          if (parsed && parsed.vote) {
            const target = alive.find(p => p.id !== player.id && playerName(p) === parsed.vote);
            if (target) voteTarget = target.id;
          }
        }
      } catch (e) {}
      if (!voteTarget) {
        const others = alive.filter(p => p.id !== player.id);
        voteTarget = others[Math.floor(Math.random() * others.length)].id;
      }
      game = getGame(sessionId);
      game.votes[player.id] = voteTarget;
      setGame(sessionId, game);
    }
    renderUcPanel(sessionId);

    // 如果用户自己已经出局，不需要等用户投票，AI票投完就直接结算
    const userPlayer = game.players.find(p => p.id === 'user');
    if (!userPlayer || !userPlayer.alive) { await resolveVotes(sessionId); }
  }

  function submitUserVote(sessionId, targetId) {
    let game = getGame(sessionId);
    if (!game || game.phase !== 'voting') return;
    const userPlayer = game.players.find(p => p.id === 'user');
    if (!userPlayer || !userPlayer.alive) return; // 已出局的话不能投票
    game.votes.user = targetId;
    setGame(sessionId, game);
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'me', text: `【投票】怀疑 ${playerName(game.players.find(p => p.id === targetId))}`, timestamp: Date.now(), readBy: [] });
    renderChatMessages(); saveAllData();
    renderUcPanel(sessionId);
    resolveVotes(sessionId);
  }
  window.__ucSubmitVote = submitUserVote;

  async function resolveVotes(sessionId) {
    let game = getGame(sessionId);
    const alive = game.players.filter(p => p.alive);
    if (Object.keys(game.votes).length < alive.length) return; // 还没投完（理论上AI都已投完，只等用户）

    const tally = {};
    Object.values(game.votes).forEach(t => { tally[t] = (tally[t] || 0) + 1; });
    let maxVotes = -1, topCandidates = [];
    for (const pid of Object.keys(tally)) {
      if (tally[pid] > maxVotes) { maxVotes = tally[pid]; topCandidates = [pid]; }
      else if (tally[pid] === maxVotes) topCandidates.push(pid);
    }
    const eliminatedId = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    const eliminated = game.players.find(p => p.id === eliminatedId);
    eliminated.alive = false;

    const voteSummary = game.players.filter(p => p.alive || p.id === eliminatedId).map(p => {
      const votersFor = Object.keys(game.votes).filter(voter => game.votes[voter] === p.id).map(voter => playerName(game.players.find(x => x.id === voter)));
      return votersFor.length > 0 ? `${playerName(p)}(${votersFor.length}票)` : null;
    }).filter(Boolean).join('、');

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'system', text: `票数统计：${voteSummary}。${playerName(eliminated)} 被投票出局，TA的身份是${eliminated.role === 'undercover' ? '卧底！' : `普通人（词是"${eliminated.word}"）`}`, timestamp: Date.now() });
    renderChatMessages(); saveAllData();
    setGame(sessionId, game);
    renderUcPanel(sessionId);

    if (eliminated.role === 'undercover') { await finishUndercover(sessionId, 'majority'); return; }

    const remaining = game.players.filter(p => p.alive);
    if (remaining.length <= 2) { await finishUndercover(sessionId, 'undercover'); return; }

    game = getGame(sessionId);
    game.round++;
    setGame(sessionId, game);
    await startClueRound(sessionId);
  }

  // ---------- 结束游戏 ----------
  async function finishUndercover(sessionId, outcome) {
    let game = getGame(sessionId);
    game.status = 'finished';
    game.winner = outcome;
    setGame(sessionId, game);

    const undercoverPlayer = game.players.find(p => p.role === 'undercover');
    const majorityWord = game.players.find(p => p.role === 'majority').word;
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    const sysText = outcome === 'majority'
      ? `🎉 好人阵营获胜！卧底 ${playerName(undercoverPlayer)} 被找出来了。多数人的词是"${majorityWord}"，卧底的词是"${undercoverPlayer.word}"。`
      : `😈 卧底获胜！${playerName(undercoverPlayer)} 一直伪装到了最后。多数人的词是"${majorityWord}"，卧底的词是"${undercoverPlayer.word}"。`;
    globalChats[sessionId].push({ sender: 'system', text: sysText, timestamp: Date.now() });
    renderChatMessages(); saveAllData();
    renderUcPanel(sessionId);
    if (typeof refreshMiniGameIconBadge === 'function') refreshMiniGameIconBadge();

    for (const p of game.players) {
      if (p.id === 'user') continue;
      const char = myCharacters.find(c => c.id == p.id);
      if (!char) continue;
      const won = (p.role === 'undercover') === (outcome === 'undercover');
      const resultText = won ? `你是${p.role === 'undercover' ? '卧底' : '好人'}，这局赢了` : `你是${p.role === 'undercover' ? '卧底' : '好人'}，这局输了`;
      await askCharGameEndComment(char, sessionId, '谁是卧底', resultText);
    }
  }

  // ---------- 样式 ----------
  const ucStyle = document.createElement('style');
  ucStyle.textContent = `
    .uc-status { text-align:center; font-weight:bold; color:#1d9bf0; margin-bottom:8px; }
    .uc-word-box { text-align:center; background:var(--gy-game-box-bg); color:var(--gy-game-box-fg); padding:8px; border-radius:6px; margin-bottom:8px; font-size:13px; }
    .uc-input { width:100%; box-sizing:border-box; padding:8px; border-radius:6px; border:1px solid #ccc; margin-top:4px; font-size:14px; }
    .uc-vote-btn { margin:3px; }
    .uc-player-list { font-size:12px; color:#8b98a5; text-align:center; margin-bottom:6px; }
  `;
  document.head.appendChild(ucStyle);

  function renderUcPanel(sessionId) {
    const game = getGame(sessionId);
    const el = document.getElementById('ucBody');
    if (!el || !game) return;

    const alivePlayers = game.players.filter(p => p.alive);
    const playerListHtml = game.players.map(p => `${playerName(p)}${p.alive ? '' : '（已出局）'}`).join('、');
    const myWord = (game.players.find(p => p.id === 'user') || {}).word || '';

    let statusText, bodyHtml = '';
    if (game.status === 'finished') {
      statusText = game.winner === 'majority' ? '🎉 好人阵营获胜！' : '😈 卧底获胜！';
      bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px;">可以点游戏图标重新开一局～</div>`;
    } else if (game.phase === 'clue') {
      const currentTurnId = game.clueOrder && game.clueOrder.length > 0 ? game.clueOrder[game.clueIndex] : null;
      const currentTurnPlayer = currentTurnId ? game.players.find(p => p.id === currentTurnId) : null;
      const isUserTurn = currentTurnId === 'user';
      statusText = `第${game.round}轮描述中`;
      if (!currentTurnPlayer) {
        bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px;">准备中...</div>`;
      } else {
        bodyHtml = isUserTurn
          ? `<div style="text-align:center; font-size:13px; color:#f91880; margin-bottom:6px;">轮到你描述了！</div>
             <input type="text" class="uc-input" id="ucClueInput" placeholder="用一句话描述你的词（别说出来）" onkeypress="if(event.key==='Enter') window.__ucSubmitClue('${sessionId}')">
             <div style="text-align:center; margin-top:6px;"><button class="btn-edit-small" onclick="window.__ucSubmitClue('${sessionId}')">发送描述</button></div>`
          : `<div style="text-align:center; color:#8b98a5; font-size:13px;">等待${playerName(currentTurnPlayer)}描述...</div>`;
      }
    } else if (game.phase === 'voting') {
      const userAlive = (game.players.find(p => p.id === 'user') || {}).alive;
      const userVoted = game.votes.user !== undefined;
      statusText = `第${game.round}轮投票中`;
      if (!userAlive) {
        bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px;">你已出局，正在旁观其他人投票...</div>`;
      } else if (userVoted) {
        bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px;">你已投票，等待结果...</div>`;
      } else {
        const candidates = alivePlayers.filter(p => p.id !== 'user');
        const btns = candidates.map(p => `<button class="btn-edit-small uc-vote-btn" onclick="window.__ucSubmitVote('${sessionId}','${p.id}')">${escapeHtml(playerName(p))}</button>`).join('');
        bodyHtml = `<div style="text-align:center; font-size:13px; margin-bottom:6px;">你怀疑谁是卧底？</div><div style="text-align:center;">${btns}</div>`;
      }
    }

    el.innerHTML = `
      <div class="uc-status">${escapeHtml(statusText)}</div>
      <div class="uc-word-box">你的词是：<b>${escapeHtml(myWord)}</b></div>
      <div class="uc-player-list">玩家：${escapeHtml(playerListHtml)}</div>
      ${bodyHtml}
      <div style="display:flex; justify-content:center; gap:10px; margin-top:14px;">
        <button class="btn-edit-small" onclick="document.getElementById('ucFloatPanel').style.display='none'">收起（继续聊天）</button>
      </div>`;
  }

  // ---------- 注册进核心小游戏框架 ----------
  if (typeof registerMiniGame === 'function') {
    registerMiniGame({
      id: 'who_is_undercover',
      name: '谁是卧底',
      icon: '🕵️',
      minOpponents: 2,
      getStatus: function (sessionId) { const g = getGame(sessionId); return g ? g.status : null; },
      onResume: function (sessionId) { openUcPanel(sessionId); },
      onStart: function (sessionId, opponentCharIds) { startUndercover(sessionId, opponentCharIds); }
    });
  } else {
    console.error('谁是卧底插件：没有找到核心小游戏框架（registerMiniGame），请确认网页已经更新到支持小游戏框架的版本。');
  }
})();

// ============ 20个问题 ============
(function () {
  if (window.__twentyQPluginInstalled) return;
  window.__twentyQPluginInstalled = true;

  const STORE_KEY = 'twentyQGamesV1';
  function loadStore() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { return {}; } }
  function saveStore(obj) { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); }
  function getGame(sessionId) { return loadStore()[sessionId] || null; }
  function setGame(sessionId, game) {
    const all = loadStore();
    if (game) all[sessionId] = game; else delete all[sessionId];
    saveStore(all);
  }

  const MAX_QUESTIONS = 20;

  // ---------- 开局：角色自己想一个秘密答案 ----------
  async function startTwentyQuestions(sessionId, opponentCharId) {
    const char = myCharacters.find(c => c.id == opponentCharId);
    const api = getApiConfig(true);
    const prompt = `${buildBasePrompt(char, false, '')}
你要和用户玩"20个问题"猜谜游戏。请你自己想一个具体的东西作为这局游戏的秘密答案（可以是动物、物品、食物、地点、人物、概念等，尽量明确具体，比如"大象"而不是"动物"）。
只输出严格JSON，不要markdown代码块包裹：
{"secret": "具体的答案，比如\\"大象\\"", "category": "这个答案所属的大类，比如\\"动物\\"", "message": "你想好之后说的一句话，符合人设语气，不超过25字，绝对不能透露具体答案是什么"}`;
    let secret = '苹果', category = '', message = '';
    try {
      const data = await callChatCompletionAPI(api, prompt);
      if (!data.error) {
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        const parsed = extractJsonObject(raw);
        if (parsed && parsed.secret) { secret = String(parsed.secret).trim(); category = parsed.category || ''; message = parsed.message || ''; }
      }
    } catch (e) {}

    const game = {
      status: 'playing',
      opponentCharId,
      secret, category,
      questionsUsed: 0,
      maxQuestions: MAX_QUESTIONS,
      winner: null,
    };
    setGame(sessionId, game);

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'system', text: `🔮 20个问题开始！${char ? char.name : '对方'}心里想好了一个答案${category ? `（大类：${category}）` : ''}，你有${MAX_QUESTIONS}次机会通过是非题或直接猜测来找出答案。`, timestamp: Date.now() });
    if (message) globalChats[sessionId].push({ sender: char.id, text: message, timestamp: Date.now(), readBy: [] });
    renderChatMessages(); saveAllData();
    openTqPanel(sessionId);
  }

  function openTqPanel(sessionId) {
    const panel = createMiniGameFloatingPanel('tqFloatPanel', '🔮 20个问题');
    panel.style.display = 'block';
    const body = panel.querySelector('.mini-game-float-body');
    if (!document.getElementById('tqBody')) body.innerHTML = `<div id="tqBody" style="max-width:300px;"></div>`;
    renderTqPanel(sessionId);
  }

  // ---------- 提问（是非题）----------
  async function submitTqQuestion(sessionId) {
    const input = document.getElementById('tqQuestionInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) { alert('写点什么问题吧～'); return; }
    let game = getGame(sessionId);
    if (!game || game.status !== 'playing') return;
    const char = myCharacters.find(c => c.id == game.opponentCharId);

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'me', text: `【提问】${text}`, timestamp: Date.now(), readBy: [] });
    renderChatMessages(); saveAllData();
    input.value = '';

    game.questionsUsed++;
    setGame(sessionId, game);
    renderTqPanel(sessionId);

    const api = getApiConfig(true);
    const recentHistory = buildTimeAwareHistoryText(globalChats[sessionId].slice(-chatHistoryTurns));
    const prompt = `${buildBasePrompt(char, true, recentHistory)}
你在和用户玩"20个问题"猜谜游戏。你心里的秘密答案是："${game.secret}"（这是只有你自己知道的秘密，绝对不能直接说出这个答案，只能如实回答用户的是非题）。
用户刚才问了："${text}"
请诚实、准确地回答这个问题是不是符合你的秘密答案"${game.secret}"的真实情况。回答只能是"是"、"不是"、"不一定/无法简单回答"这三种之一，可以在后面附一句符合人设语气的俏皮话或反应，但绝对不能透露具体答案。
只输出严格JSON，不要markdown代码块包裹：
{"answer": "是/不是/不一定", "message": "你的完整回复，包含答案判断和你的反应，不超过40字"}`;
    let reply = '不一定～';
    try {
      const data = await callChatCompletionAPI(api, prompt);
      if (!data.error) {
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        const parsed = extractJsonObject(raw);
        if (parsed && parsed.message) reply = parsed.message;
        else if (parsed && parsed.answer) reply = parsed.answer;
      }
    } catch (e) {}

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: char.id, text: reply, timestamp: Date.now(), readBy: [] });
    renderChatMessages(); saveAllData();

    game = getGame(sessionId);
    if (game.questionsUsed >= game.maxQuestions) {
      await finishTwentyQuestions(sessionId, 'lose');
      return;
    }
    renderTqPanel(sessionId);
  }
  window.__tqSubmitQuestion = submitTqQuestion;

  // ---------- 直接猜测答案 ----------
  async function submitTqGuess(sessionId) {
    const input = document.getElementById('tqGuessInput');
    if (!input) return;
    const guess = input.value.trim();
    if (!guess) { alert('写下你猜的答案吧～'); return; }
    let game = getGame(sessionId);
    if (!game || game.status !== 'playing') return;
    const char = myCharacters.find(c => c.id == game.opponentCharId);

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'me', text: `【猜测】${guess}`, timestamp: Date.now(), readBy: [] });
    renderChatMessages(); saveAllData();
    input.value = '';

    game.questionsUsed++;
    setGame(sessionId, game);
    renderTqPanel(sessionId);

    const api = getApiConfig(true);
    const prompt = `秘密答案是："${game.secret}"。用户猜的是："${guess}"。
请判断用户猜的这个东西和秘密答案是不是同一个东西（允许别名、同义词、相近的合理表述算作猜对，比如"手机"和"智能手机"算对，但明显不同的东西算错）。
只输出严格JSON，不要markdown代码块包裹：
{"correct": true或false}`;
    let correct = false;
    try {
      const data = await callChatCompletionAPI(api, prompt);
      if (!data.error) {
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        const parsed = extractJsonObject(raw);
        if (parsed) correct = !!parsed.correct;
      }
    } catch (e) {}
    if (!correct && guess.trim() === game.secret.trim()) correct = true; // 兜底：完全一致的字符串也算对

    if (correct) {
      await finishTwentyQuestions(sessionId, 'win');
      return;
    }

    game = getGame(sessionId);
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    const remaining = game.maxQuestions - game.questionsUsed;
    if (remaining <= 0) {
      globalChats[sessionId].push({ sender: char.id, text: `不对哦～机会用完啦！`, timestamp: Date.now(), readBy: [] });
      renderChatMessages(); saveAllData();
      await finishTwentyQuestions(sessionId, 'lose');
      return;
    }
    globalChats[sessionId].push({ sender: char.id, text: `不对～还剩${remaining}次机会，继续加油！`, timestamp: Date.now(), readBy: [] });
    renderChatMessages(); saveAllData();
    renderTqPanel(sessionId);
  }
  window.__tqSubmitGuess = submitTqGuess;

  async function finishTwentyQuestions(sessionId, outcome) {
    let game = getGame(sessionId);
    game.status = 'finished';
    game.winner = outcome === 'win' ? 'user' : 'char';
    setGame(sessionId, game);
    const char = myCharacters.find(c => c.id == game.opponentCharId);

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    const sysText = outcome === 'win' ? `🎉 猜对了！答案就是"${game.secret}"，用了${game.questionsUsed}次机会。` : `😮 没能猜中，正确答案是"${game.secret}"。`;
    globalChats[sessionId].push({ sender: 'system', text: sysText, timestamp: Date.now() });
    renderChatMessages(); saveAllData();
    renderTqPanel(sessionId);
    if (typeof refreshMiniGameIconBadge === 'function') refreshMiniGameIconBadge();

    if (char) {
      const resultText = outcome === 'win' ? `用户猜中了你的答案"${game.secret}"，用了${game.questionsUsed}次机会` : `用户没能猜中你的答案"${game.secret}"，机会用完了`;
      await askCharGameEndComment(char, sessionId, '20个问题', resultText);
    }
  }

  // ---------- 样式 ----------
  const tqStyle = document.createElement('style');
  tqStyle.textContent = `
    .tq-status { text-align:center; font-weight:bold; color:#1d9bf0; margin-bottom:8px; }
    .tq-input { width:100%; box-sizing:border-box; padding:8px; border-radius:6px; border:1px solid #ccc; margin-top:4px; font-size:14px; }
    .tq-section { margin-top:10px; padding-top:10px; border-top:1px dashed #ccc; }
  `;
  document.head.appendChild(tqStyle);

  function renderTqPanel(sessionId) {
    const game = getGame(sessionId);
    const el = document.getElementById('tqBody');
    if (!el || !game) return;
    const char = myCharacters.find(c => c.id == game.opponentCharId);
    const charName = char ? char.name : '对方';
    const remaining = game.maxQuestions - game.questionsUsed;

    let statusText, bodyHtml;
    if (game.status === 'finished') {
      statusText = game.winner === 'user' ? `🎉 你猜中了！答案是"${game.secret}"` : `😮 没猜中，答案是"${game.secret}"`;
      bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px;">可以点游戏图标重新开一局～</div>`;
    } else {
      statusText = `剩余机会：${remaining} / ${game.maxQuestions}${game.category ? `　大类提示：${escapeHtml(game.category)}` : ''}`;
      bodyHtml = `
        <div class="tq-section">
          <div style="font-size:13px; color:#536471;">问一个是非题（${charName}只会回答"是/不是/不一定"）：</div>
          <input type="text" class="tq-input" id="tqQuestionInput" placeholder="比如：它是活的吗？" onkeypress="if(event.key==='Enter') window.__tqSubmitQuestion('${sessionId}')">
          <div style="text-align:center; margin-top:6px;"><button class="btn-edit-small" onclick="window.__tqSubmitQuestion('${sessionId}')">提问</button></div>
        </div>
        <div class="tq-section">
          <div style="font-size:13px; color:#536471;">直接猜答案：</div>
          <input type="text" class="tq-input" id="tqGuessInput" placeholder="猜猜是什么" onkeypress="if(event.key==='Enter') window.__tqSubmitGuess('${sessionId}')">
          <div style="text-align:center; margin-top:6px;"><button class="btn-edit-small" onclick="window.__tqSubmitGuess('${sessionId}')">猜测</button></div>
        </div>`;
    }

    el.innerHTML = `
      <div class="tq-status">${escapeHtml(statusText)}</div>
      ${bodyHtml}
      <div style="display:flex; justify-content:center; gap:10px; margin-top:14px;">
        <button class="btn-edit-small" onclick="document.getElementById('tqFloatPanel').style.display='none'">收起（继续聊天）</button>
      </div>`;
  }

  // ---------- 注册进核心小游戏框架 ----------
  if (typeof registerMiniGame === 'function') {
    registerMiniGame({
      id: 'twenty_questions',
      name: '20个问题',
      icon: '🔮',
      getStatus: function (sessionId) { const g = getGame(sessionId); return g ? g.status : null; },
      onResume: function (sessionId) { openTqPanel(sessionId); },
      onStart: function (sessionId, opponentCharIds) { startTwentyQuestions(sessionId, (opponentCharIds || [])[0]); }
    });
  } else {
    console.error('20个问题插件：没有找到核心小游戏框架（registerMiniGame），请确认网页已经更新到支持小游戏框架的版本。');
  }
})();

// ============ 真心话大冒险 ============
(function () {
  if (window.__truthOrDarePluginInstalled) return;
  window.__truthOrDarePluginInstalled = true;

  const STORE_KEY = 'truthOrDareGamesV1';
  function loadStore() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { return {}; } }
  function saveStore(obj) { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); }
  function getGame(sessionId) { return loadStore()[sessionId] || null; }
  function setGame(sessionId, game) {
    const all = loadStore();
    if (game) all[sessionId] = game; else delete all[sessionId];
    saveStore(all);
  }
  window.__todSetGame = setGame;

  // ---------- 开局 ----------
  function startTruthOrDare(sessionId, opponentCharId) {
    const activePlayer = Math.random() < 0.5 ? 'user' : 'char';
    const game = {
      status: 'playing',
      opponentCharId,
      activePlayer,
      phase: 'choosing', // choosing | awaiting_question | awaiting_answer
      charChoice: null,
      round: 1,
    };
    setGame(sessionId, game);
    const char = myCharacters.find(c => c.id == opponentCharId);
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'system', text: `🎲 真心话大冒险开始！${activePlayer === 'user' ? '你先选真心话还是大冒险' : `${char ? char.name : '对方'}先选`}。`, timestamp: Date.now() });
    renderChatMessages(); saveAllData();
    openTodPanel(sessionId);
    if (activePlayer === 'char') runCharChoosePhase(sessionId);
  }

  function openTodPanel(sessionId) {
    const panel = createMiniGameFloatingPanel('todFloatPanel', '🎲 真心话大冒险');
    panel.style.display = 'block';
    const body = panel.querySelector('.mini-game-float-body');
    if (!document.getElementById('todBody')) body.innerHTML = `<div id="todBody" style="max-width:300px;"></div>`;
    renderTodPanel(sessionId);
  }

  // ---------- 角色回合：自己选真心话/大冒险 ----------
  async function runCharChoosePhase(sessionId) {
    let game = getGame(sessionId);
    const char = myCharacters.find(c => c.id == game.opponentCharId);
    const api = getApiConfig(true);
    const recentHistory = buildTimeAwareHistoryText(globalChats[sessionId].slice(-chatHistoryTurns));
    const prompt = `${buildBasePrompt(char, true, recentHistory)}
你在和用户玩真心话大冒险。现在轮到你被问，你需要自己选择"真心话"还是"大冒险"（请结合你的性格：大胆/外向的角色可以多选大冒险，内敛/害羞的角色可以多选真心话，也可以纯粹看当下心情）。
只输出严格JSON，不要markdown代码块包裹：
{"choice": "truth或dare", "message": "你做这个选择时说的一句话，符合人设语气，不超过25字"}`;
    let choice = 'truth', message = '';
    try {
      const data = await callChatCompletionAPI(api, prompt);
      if (!data.error) {
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        const parsed = extractJsonObject(raw);
        if (parsed) { choice = parsed.choice === 'dare' ? 'dare' : 'truth'; message = parsed.message || ''; }
      }
    } catch (e) {}

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: char.id, text: `【选择了${choice === 'dare' ? '大冒险' : '真心话'}】${message}`, timestamp: Date.now(), readBy: [] });
    renderChatMessages(); saveAllData();

    game = getGame(sessionId);
    game.charChoice = choice;
    game.phase = 'awaiting_question';
    setGame(sessionId, game);
    renderTodPanel(sessionId);
  }

  // ---------- 用户给角色出题（真心话问题或大冒险挑战）----------
  async function submitQuestionForChar(sessionId) {
    const input = document.getElementById('todQuestionInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) { alert('写点什么吧～'); return; }
    let game = getGame(sessionId);
    if (!game || game.phase !== 'awaiting_question' || game.activePlayer !== 'char') return;
    const char = myCharacters.find(c => c.id == game.opponentCharId);
    const tag = game.charChoice === 'dare' ? '大冒险挑战' : '真心话提问';

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'me', text: `【${tag}】${text}`, timestamp: Date.now(), readBy: [] });
    renderChatMessages(); saveAllData();

    game.phase = 'awaiting_answer';
    setGame(sessionId, game);
    renderTodPanel(sessionId);

    const api = getApiConfig(true);
    const recentHistory = buildTimeAwareHistoryText(globalChats[sessionId].slice(-chatHistoryTurns));
    const actionWord = game.charChoice === 'dare' ? '大冒险挑战，请你详细描述自己实际去完成/尝试这个挑战的过程和反应' : '真心话问题，请你诚实、符合人设地回答';
    const prompt = `${buildBasePrompt(char, true, recentHistory)}
用户刚才向你提出了一个${game.charChoice === 'dare' ? '大冒险挑战' : '真心话问题'}：「${text}」
请${actionWord}。符合你的人设和性格，可以带情绪、带反应，不超过120字。
只输出你的回应内容本身，不要markdown、不要多余说明。`;
    let answer = '';
    try {
      const data = await callChatCompletionAPI(api, prompt);
      if (!data.error) answer = (data.choices?.[0]?.message?.content || '').trim().replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
    } catch (e) {}
    if (!answer) answer = '（好像不知道该说什么……）';

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: char.id, text: answer, timestamp: Date.now(), readBy: [] });
    renderChatMessages(); saveAllData();

    game = getGame(sessionId);
    game.activePlayer = 'user';
    game.phase = 'choosing';
    game.round++;
    setGame(sessionId, game);
    renderTodPanel(sessionId);
  }
  window.__todSubmitQuestion = submitQuestionForChar;

  // ---------- 用户回合：自己选真心话/大冒险，角色出题 ----------
  async function userPickChoice(sessionId, choice) {
    let game = getGame(sessionId);
    if (!game || game.phase !== 'choosing' || game.activePlayer !== 'user') return;
    const char = myCharacters.find(c => c.id == game.opponentCharId);

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'me', text: `【选择】${choice === 'dare' ? '大冒险' : '真心话'}`, timestamp: Date.now(), readBy: [] });
    renderChatMessages(); saveAllData();

    game.phase = 'awaiting_answer'; // 角色出题中
    setGame(sessionId, game);
    renderTodPanel(sessionId);

    const api = getApiConfig(true);
    const recentHistory = buildTimeAwareHistoryText(globalChats[sessionId].slice(-chatHistoryTurns));
    const askWord = choice === 'dare' ? '给用户出一个大冒险挑战（一件用户可以在现实里去做/尝试并回来描述结果的小挑战，不要太出格）' : '给用户出一个真心话问题（可以是关于用户本人、关于你们的关系、或者你好奇的事情）';
    const prompt = `${buildBasePrompt(char, true, recentHistory)}
用户在真心话大冒险里选择了"${choice === 'dare' ? '大冒险' : '真心话'}"，请结合你的人设、性格、和你们的关系，${askWord}。
只输出这个问题/挑战本身，不要markdown、不要多余说明，不超过50字。`;
    let question = '';
    try {
      const data = await callChatCompletionAPI(api, prompt);
      if (!data.error) question = (data.choices?.[0]?.message?.content || '').trim().replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
    } catch (e) {}
    if (!question) question = choice === 'dare' ? '去做一件让自己觉得有点不好意思的小事，然后告诉我结果～' : '说一件你一直没告诉过别人的小秘密吧。';

    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: char.id, text: `【${choice === 'dare' ? '大冒险挑战' : '真心话提问'}】${question}`, timestamp: Date.now(), readBy: [] });
    renderChatMessages(); saveAllData();

    game = getGame(sessionId);
    game.phase = 'awaiting_answer'; // 等待用户在正常聊天框里回答，回答完点"下一轮"继续
    setGame(sessionId, game);
    renderTodPanel(sessionId);
  }
  window.__todPickChoice = userPickChoice;

  function userDoneAnswering(sessionId) {
    let game = getGame(sessionId);
    if (!game || game.activePlayer !== 'user' || game.phase !== 'awaiting_answer') return;
    game.activePlayer = 'char';
    game.phase = 'choosing';
    game.round++;
    setGame(sessionId, game);
    renderTodPanel(sessionId);
    runCharChoosePhase(sessionId);
  }
  window.__todDoneAnswering = userDoneAnswering;

  async function endTruthOrDare(sessionId) {
    let game = getGame(sessionId);
    if (!game) return;
    game.status = 'finished';
    setGame(sessionId, game);
    const char = myCharacters.find(c => c.id == game.opponentCharId);
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'system', text: `🎲 真心话大冒险结束，一共玩了${game.round}轮。`, timestamp: Date.now() });
    renderChatMessages(); saveAllData();
    renderTodPanel(sessionId);
    if (typeof refreshMiniGameIconBadge === 'function') refreshMiniGameIconBadge();
    if (char) await askCharGameEndComment(char, sessionId, '真心话大冒险', `一起玩了${game.round}轮，聊了很多`);
  }
  window.__todEndGame = endTruthOrDare;

  // ---------- 样式 ----------
  const todStyle = document.createElement('style');
  todStyle.textContent = `
    .tod-status { text-align:center; font-weight:bold; color:#1d9bf0; margin-bottom:8px; }
    .tod-choice-btn { margin:4px; padding:10px 18px; }
    .tod-input { width:100%; box-sizing:border-box; padding:8px; border-radius:6px; border:1px solid #ccc; margin-top:6px; font-size:14px; }
  `;
  document.head.appendChild(todStyle);

  function renderTodPanel(sessionId) {
    const game = getGame(sessionId);
    const el = document.getElementById('todBody');
    if (!el || !game) return;
    const char = myCharacters.find(c => c.id == game.opponentCharId);
    const charName = char ? char.name : '对方';

    let bodyHtml = '';
    let statusText = `第${game.round}轮`;

    if (game.status === 'finished') {
      statusText = '游戏已结束';
      bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px;">可以点下面的图标重新开始一局～</div>`;
    } else if (game.activePlayer === 'char') {
      if (game.phase === 'choosing') {
        statusText += `：${charName}选择中...`;
        bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px;">等${charName}决定真心话还是大冒险</div>`;
      } else if (game.phase === 'awaiting_question') {
        statusText += `：${charName}选了${game.charChoice === 'dare' ? '大冒险' : '真心话'}，该你出题了`;
        bodyHtml = `
          <textarea class="tod-input" id="todQuestionInput" rows="3" placeholder="${game.charChoice === 'dare' ? '给TA出一个大冒险挑战吧...' : '想问TA什么真心话...'}"></textarea>
          <div style="text-align:center; margin-top:8px;"><button class="btn-edit-small" onclick="window.__todSubmitQuestion('${sessionId}')">发送给TA</button></div>`;
      } else {
        statusText += `：${charName}正在回答/挑战中...`;
        bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px;">请稍等，去下面聊天记录里看看TA的反应～</div>`;
      }
    } else {
      if (game.phase === 'choosing') {
        statusText += '：轮到你选了';
        bodyHtml = `
          <div style="text-align:center;">
            <button class="btn-edit-small tod-choice-btn" onclick="window.__todPickChoice('${sessionId}','truth')">💬 真心话</button>
            <button class="btn-edit-small tod-choice-btn" onclick="window.__todPickChoice('${sessionId}','dare')">🔥 大冒险</button>
          </div>`;
      } else {
        statusText += `：${charName}出题中或已出题，去聊天框回答TA吧`;
        bodyHtml = `<div style="text-align:center; color:#8b98a5; font-size:13px; margin-bottom:8px;">在下面正常聊天框里回答/描述你的表现，回答完点这里继续</div>
          <div style="text-align:center;"><button class="btn-edit-small" onclick="window.__todDoneAnswering('${sessionId}')">回答完了，下一轮</button></div>`;
      }
    }

    el.innerHTML = `
      <div class="tod-status">${escapeHtml(statusText)}</div>
      ${bodyHtml}
      <div style="display:flex; justify-content:center; gap:10px; margin-top:14px; flex-wrap:wrap;">
        ${game.status === 'playing' ? `<button class="btn-edit-small" style="color:#f91880; border-color:#f91880;" onclick="window.__todEndGame('${sessionId}')">结束游戏</button>` : ''}
        <button class="btn-edit-small" onclick="document.getElementById('todFloatPanel').style.display='none'">收起（继续聊天）</button>
      </div>`;
  }

  // ---------- 注册进核心小游戏框架 ----------
  if (typeof registerMiniGame === 'function') {
    registerMiniGame({
      id: 'truth_or_dare',
      name: '真心话大冒险',
      icon: '🎲',
      getStatus: function (sessionId) { const g = getGame(sessionId); return g ? g.status : null; },
      onResume: function (sessionId) { openTodPanel(sessionId); },
      onStart: function (sessionId, opponentCharIds) { startTruthOrDare(sessionId, (opponentCharIds || [])[0]); }
    });
  } else {
    console.error('真心话大冒险插件：没有找到核心小游戏框架（registerMiniGame），请确认网页已经更新到支持小游戏框架的版本。');
  }
})();

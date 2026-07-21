(() => {
  "use strict";

  const SUPABASE_URL = "https://rhvdzxlsiucpmyvnpgnj.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_jNE0IO0wrnOV1ysYpQzohg_ECMdRE_U";
  const SITE_URL = "https://wenqing479-droid.github.io/our-diary/";
  const META_KEY = "senye_cloud_meta_v1";
  const AUTO_SYNC_DELAY = 4500;

  const $ = id => document.getElementById(id);
  const els = {
    accountBtn: $("cloudAccountBtn"),
    accountLabel: $("cloudAccountLabel"),
    ribbon: $("cloudRibbon"),
    statusDot: $("cloudStatusDot"),
    statusText: $("cloudStatusText"),
    ribbonBtn: $("cloudRibbonBtn"),
    openPanelBtn: $("openCloudPanelBtn"),
    backupSummary: $("cloudBackupSummary"),
    modal: $("cloudModal"),
    modalClose: $("cloudModalClose"),
    subtitle: $("cloudModalSubtitle"),
    notice: $("cloudNotice"),
    authForm: $("cloudAuthForm"),
    email: $("cloudEmail"),
    password: $("cloudPassword"),
    signupBtn: $("cloudSignupBtn"),
    resetBtn: $("cloudResetBtn"),
    recovery: $("cloudRecovery"),
    newPassword: $("cloudNewPassword"),
    newPasswordAgain: $("cloudNewPasswordAgain"),
    updatePasswordBtn: $("cloudUpdatePasswordBtn"),
    userPanel: $("cloudUserPanel"),
    userEmail: $("cloudUserEmail"),
    logoutBtn: $("cloudLogoutBtn"),
    localSummary: $("cloudLocalSummary"),
    remoteSummary: $("cloudRemoteSummary"),
    lastSync: $("cloudLastSync"),
    conflictNote: $("cloudConflictNote"),
    syncNowBtn: $("cloudSyncNowBtn"),
    mergeBtn: $("cloudMergeBtn"),
    restoreBtn: $("cloudRestoreBtn"),
    autoStatus: $("cloudAutoStatus"),
    historyList: $("cloudHistoryList"),
    refreshHistoryBtn: $("cloudRefreshHistoryBtn")
  };

  let client = null;
  let session = null;
  let user = null;
  let cloudRow = null;
  let cloudReady = false;
  let applyingRemote = false;
  let syncing = false;
  let queuedSync = false;
  let autoTimer = null;
  let recoveryMode = false;
  let handledUserId = "";
  let remoteCheckTimer = null;
  let lastRemoteCheckAt = 0;

  function makeDeviceId() {
    return crypto.randomUUID?.() || `device_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function loadMeta() {
    try {
      const parsed = JSON.parse(localStorage.getItem(META_KEY) || "{}");
      return {
        deviceId: String(parsed.deviceId || makeDeviceId()),
        dirtyAt: Number(parsed.dirtyAt || 0),
        lastSyncAt: Number(parsed.lastSyncAt || 0),
        lastCloudUpdatedAt: String(parsed.lastCloudUpdatedAt || ""),
        lastDailyBackup: String(parsed.lastDailyBackup || "")
      };
    } catch (_) {
      return {
        deviceId: makeDeviceId(),
        dirtyAt: 0,
        lastSyncAt: 0,
        lastCloudUpdatedAt: "",
        lastDailyBackup: ""
      };
    }
  }

  let meta = loadMeta();
  saveMeta();

  function saveMeta() {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
      return true;
    } catch (_) {
      // 云端状态已经完成时，不让一个很小的本机元数据写入失败误报整次同步失败。
      return false;
    }
  }

  function openModal() {
    els.modal?.classList.remove("hidden");
    document.body.classList.add("cloud-modal-open");
    updatePanel();
    setTimeout(() => {
      if (!user) els.email?.focus();
    }, 30);
  }

  function closeModal() {
    els.modal?.classList.add("hidden");
    document.body.classList.remove("cloud-modal-open");
  }

  function setNotice(message, kind = "info") {
    if (!els.notice) return;
    els.notice.textContent = message;
    els.notice.dataset.kind = kind;
  }

  function setStatus(message, kind = "local") {
    if (els.statusText) els.statusText.textContent = message;
    if (els.statusDot) els.statusDot.dataset.status = kind;
    if (els.backupSummary) els.backupSummary.textContent = message;
  }

  function setBusy(button, busy, busyText = "处理中…") {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.textContent = busyText;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
      delete button.dataset.originalText;
    }
  }

  function formatTime(value) {
    if (!value) return "还没有同步";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "还没有同步";
    return new Intl.DateTimeFormat("zh-CN", {
      month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(date);
  }

  function summaryOf(state) {
    const entries = Array.isArray(state?.entries) ? state.entries : [];
    const messages = Array.isArray(state?.messages) ? state.messages : [];
    const photos = entries.reduce((sum, entry) => sum + (Array.isArray(entry?.photos) ? entry.photos.length : 0), 0);
    const avatars = state?.avatars && typeof state.avatars === "object"
      ? Number(Boolean(state.avatars.qingqing)) + Number(Boolean(state.avatars.laogong))
      : 0;
    return {entries: entries.length, photos, messages: messages.length, customAvatars: avatars};
  }

  function summaryText(summary) {
    return `${summary.entries} 篇日记 · ${summary.photos} 张照片 · ${summary.messages} 条对话`;
  }

  function hasContent(summary) {
    return summary.entries > 0 || summary.messages > 0 || summary.customAvatars > 0;
  }

  function comparableState(rawState) {
    const state = rawState && typeof rawState === "object" ? rawState : {};
    return {
      entries: Array.isArray(state.entries) ? state.entries : [],
      messages: Array.isArray(state.messages) ? state.messages : [],
      avatars: state.avatars && typeof state.avatars === "object" ? state.avatars : {},
      theme: state.theme === "night" ? "night" : "day"
    };
  }

  function statesEqual(left, right) {
    return JSON.stringify(comparableState(left)) === JSON.stringify(comparableState(right));
  }

  function localHasUnsyncedChanges() {
    return Number(meta.dirtyAt || 0) > Number(meta.lastSyncAt || 0);
  }

  function remoteChangedSinceLastSync(row) {
    return Boolean(
      meta.lastCloudUpdatedAt &&
      row?.updated_at &&
      meta.lastCloudUpdatedAt !== row.updated_at
    );
  }

  function localState(overrideState = null) {
    const state = overrideState || window.HomeApp?.getState?.() || {entries: [], messages: [], avatars: {}, theme: "day"};
    return {
      schema: "senye-cloud-state",
      version: 1,
      savedAt: new Date().toISOString(),
      deviceId: meta.deviceId,
      ...state,
      summary: summaryOf(state)
    };
  }

  function updatePanel() {
    const local = summaryOf(window.HomeApp?.getState?.() || {});
    if (els.localSummary) els.localSummary.textContent = summaryText(local);
    if (els.remoteSummary) {
      els.remoteSummary.textContent = cloudRow?.state
        ? summaryText(summaryOf(cloudRow.state))
        : user ? "云端还没有内容" : "登录后读取";
    }
    if (els.lastSync) els.lastSync.textContent = meta.lastSyncAt ? formatTime(meta.lastSyncAt) : "还没有同步";
    if (els.autoStatus) els.autoStatus.textContent = user ? (cloudReady ? "已开启" : "等待确认") : "登录后开启";
    if (els.conflictNote) els.conflictNote.classList.toggle("hidden", !(user && cloudRow?.state && !cloudReady));

    if (user) {
      els.authForm?.classList.add("hidden");
      if (!recoveryMode) els.recovery?.classList.add("hidden");
      els.userPanel?.classList.remove("hidden");
      if (els.userEmail) els.userEmail.textContent = user.email || "已登录用户";
      if (els.accountLabel) els.accountLabel.textContent = "云端已登录";
      if (els.ribbonBtn) els.ribbonBtn.textContent = "查看云端";
    } else {
      els.authForm?.classList.remove("hidden");
      if (!recoveryMode) els.recovery?.classList.add("hidden");
      els.userPanel?.classList.add("hidden");
      if (els.accountLabel) els.accountLabel.textContent = "云端登录";
      if (els.ribbonBtn) els.ribbonBtn.textContent = "登录云端";
    }
  }

  function friendlyError(error) {
    const message = String(error?.message || error || "操作失败");
    const lower = message.toLowerCase();
    if (lower.includes("invalid login credentials")) return "邮箱或密码不正确";
    if (lower.includes("email not confirmed")) return "邮箱还没有确认，请先打开确认邮件";
    if (lower.includes("user already registered")) return "这个邮箱已经注册过了，可以直接登录";
    if (lower.includes("password should be at least")) return "密码至少需要 6 位";
    if (lower.includes("rate limit")) return "操作太频繁啦，稍等一会儿再试";
    if (lower.includes("failed to fetch") || lower.includes("load failed") || lower.includes("network")) return "网络连接失败，请切换网络后重试";
    if (lower.includes("payload") || lower.includes("too large") || lower.includes("413")) {
      return "云端数据包太大，照片较多时需要升级为独立图片仓库。请先保留完整备份。";
    }
    return message;
  }

  async function fetchCloudRow() {
    if (!user) return null;
    const {data, error} = await client
      .from("senye_state")
      .select("state,state_version,device_id,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    cloudRow = data || null;
    updatePanel();
    return cloudRow;
  }

  async function createBackup(state, reason) {
    if (!user || !state) return;
    const {error} = await client
      .from("senye_backups")
      .insert({user_id: user.id, state, reason});
    if (error) throw error;
  }

  function todayKey() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  async function ensureDailyBackup(state) {
    if (!user || !state) return;
    const today = todayKey();
    if (meta.lastDailyBackup === today) return;

    const {data, error} = await client
      .from("senye_backups")
      .select("created_at")
      .order("created_at", {ascending: false})
      .limit(1);
    if (error) throw error;

    const latestDay = data?.[0]?.created_at ? String(data[0].created_at).slice(0, 10) : "";
    if (latestDay !== new Date().toISOString().slice(0, 10)) {
      await createBackup(state, "daily");
    }
    meta.lastDailyBackup = today;
    saveMeta();
  }

  async function saveToCloud(reason = "manual", overrideState = null) {
    if (!user) {
      openModal();
      setNotice("请先登录云端账号。", "warn");
      return false;
    }
    if (syncing) {
      queuedSync = true;
      return false;
    }

    syncing = true;
    setStatus("正在把小屋保存到云端…", "syncing");
    setNotice("正在同步，请不要关闭页面。", "info");
    updatePanel();

    try {
      await window.HomeApp?.ready;
      if (reason === "auto" && cloudRow?.state && meta.lastCloudUpdatedAt) {
        const knownUpdatedAt = meta.lastCloudUpdatedAt;
        const {data: latest, error: latestError} = await client
          .from("senye_state")
          .select("state,state_version,device_id,updated_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (latestError) throw latestError;
        if (latest?.updated_at && latest.updated_at !== knownUpdatedAt) {
          cloudRow = latest;
          cloudReady = false;
          setStatus("另一台设备有新内容，已暂停自动覆盖", "warn");
          setNotice("检测到云端刚刚更新。请先安全合并，避免覆盖另一台设备的内容。", "warn");
          openModal();
          updatePanel();
          return false;
        }
      }

      const nextState = localState(overrideState);
      const previous = cloudRow?.state || null;

      if (previous && (reason === "manual" || reason === "merge" || reason === "replace-local" || reason === "emergency")) {
        await createBackup(previous, `before_${reason}`);
      }
      await ensureDailyBackup(previous || nextState);

      const nextVersion = Number(cloudRow?.state_version || 0) + 1;
      const {data, error} = await client
        .from("senye_state")
        .upsert({
          user_id: user.id,
          state: nextState,
          state_version: nextVersion,
          device_id: meta.deviceId
        }, {onConflict: "user_id"})
        .select("state,state_version,device_id,updated_at")
        .single();
      if (error) throw error;

      cloudRow = data;
      const now = Date.now();
      meta.lastSyncAt = now;
      meta.dirtyAt = 0;
      meta.lastCloudUpdatedAt = data.updated_at || "";
      saveMeta();
      cloudReady = true;
      setStatus(`云端已保存 · ${formatTime(now)}`, "saved");
      setNotice("同步完成，日记、照片、对话和头像都已写入云端。", "success");
      updatePanel();
      return true;
    } catch (error) {
      setStatus("云端同步失败，本机内容仍然安全", "error");
      setNotice(`同步失败：${friendlyError(error)}`, "error");
      return false;
    } finally {
      syncing = false;
      if (queuedSync) {
        queuedSync = false;
        scheduleAutoSync(800);
      }
    }
  }

  async function applyRemote(mode = "replace") {
    if (!user) return false;
    setStatus(mode === "merge" ? "正在安全合并…" : "正在从云端恢复…", "syncing");
    setNotice("正在读取云端内容。", "info");
    try {
      const row = await fetchCloudRow();
      if (!row?.state) {
        setNotice("云端还没有可恢复的内容。", "warn");
        setStatus("云端还没有内容", "local");
        return false;
      }

      applyingRemote = true;
      await window.HomeApp.applyCloudState(row.state, mode);
      applyingRemote = false;

      meta.lastSyncAt = Date.now();
      meta.dirtyAt = 0;
      meta.lastCloudUpdatedAt = row.updated_at || "";
      saveMeta();
      cloudReady = true;

      if (mode === "merge") {
        setNotice("本机与云端已经安全合并，正在保存合并结果。", "success");
        await saveToCloud("merge");
      } else {
        setStatus(`已从云端恢复 · ${formatTime(meta.lastSyncAt)}`, "saved");
        setNotice("云端内容已完整恢复到本机。", "success");
        updatePanel();
      }
      return true;
    } catch (error) {
      applyingRemote = false;
      setStatus("云端恢复失败，本机内容没有改变", "error");
      setNotice(`恢复失败：${friendlyError(error)}`, "error");
      return false;
    }
  }

  function scheduleAutoSync(delay = AUTO_SYNC_DELAY) {
    clearTimeout(autoTimer);
    if (!user || !cloudReady || applyingRemote) return;
    setStatus("本机有新内容，等待自动同步…", "pending");
    autoTimer = setTimeout(() => saveToCloud("auto"), delay);
  }

  async function reconcileAfterLogin() {
    await window.HomeApp?.ready;
    if (!user || handledUserId === user.id) return;
    handledUserId = user.id;
    setStatus("正在检查云端小屋…", "syncing");
    setNotice("登录成功，正在比较本机和云端内容。", "info");

    try {
      const row = await fetchCloudRow();
      const currentLocalState = window.HomeApp?.getState?.() || {};
      const local = summaryOf(currentLocalState);
      const remote = summaryOf(row?.state || {});

      if (!row?.state) {
        cloudReady = true;
        if (hasContent(local)) {
          setNotice("云端还是空的，正在把本机小屋第一次保存上去。", "info");
          await saveToCloud("first_upload");
        } else {
          setStatus("云端已连接，等待第一篇日记", "saved");
          setNotice("账号已连接。写下内容后会自动同步。", "success");
        }
      } else if (!hasContent(local) && hasContent(remote)) {
        setNotice("这台设备还没有内容，正在把云端小屋搬回来。", "info");
        await applyRemote("replace");
      } else if (statesEqual(currentLocalState, row.state)) {
        cloudReady = true;
        meta.lastCloudUpdatedAt = row.updated_at || "";
        meta.lastSyncAt = Date.now();
        meta.dirtyAt = 0;
        saveMeta();
        setStatus("本机与云端内容一致", "saved");
        setNotice("内容已经一致，自动同步已开启。", "success");
      } else {
        const localDirty = localHasUnsyncedChanges();
        const knowsPreviousCloud = Boolean(meta.lastCloudUpdatedAt);
        const remoteChanged = remoteChangedSinceLastSync(row);

        if (knowsPreviousCloud && remoteChanged && !localDirty) {
          setNotice("另一台设备有新内容，正在自动更新这台设备。", "info");
          await applyRemote("replace");
        } else if (knowsPreviousCloud && !remoteChanged && localDirty) {
          cloudReady = true;
          setNotice("发现本机有尚未上传的内容，正在继续同步。", "info");
          await saveToCloud("auto");
        } else if (meta.lastCloudUpdatedAt && meta.lastCloudUpdatedAt === row.updated_at && !localDirty) {
          setNotice("发现本机缓存与已保存的云端版本不一致，正在自动修复本机。", "info");
          await applyRemote("replace");
        } else {
          cloudReady = false;
          setStatus("本机和云端都有新内容，等待选择", "warn");
          setNotice("两台设备都改过内容。请点“安全合并本机与云端”。", "warn");
          openModal();
        }
      }
    } catch (error) {
      setStatus("已登录，但暂时无法读取云端", "error");
      setNotice(`读取云端失败：${friendlyError(error)}`, "error");
    }
    updatePanel();
  }

  async function checkForRemoteUpdates() {
    await window.HomeApp?.ready;
    if (!user || !cloudReady || syncing || applyingRemote || document.hidden) return;
    const now = Date.now();
    if (now - lastRemoteCheckAt < 2500) return;
    lastRemoteCheckAt = now;

    try {
      const row = await fetchCloudRow();
      if (!row?.state) return;

      const currentLocalState = window.HomeApp?.getState?.() || {};
      if (statesEqual(currentLocalState, row.state)) {
        meta.lastCloudUpdatedAt = row.updated_at || meta.lastCloudUpdatedAt;
        meta.lastSyncAt = Math.max(meta.lastSyncAt || 0, Date.now());
        meta.dirtyAt = 0;
        saveMeta();
        cloudReady = true;
        updatePanel();
        return;
      }

      const remoteChanged = remoteChangedSinceLastSync(row);
      const localDirty = localHasUnsyncedChanges();

      if (remoteChanged && !localDirty) {
        setStatus("发现另一台设备的新内容，正在更新…", "syncing");
        await applyRemote("replace");
      } else if (remoteChanged && localDirty) {
        cloudReady = false;
        setStatus("两台设备都有新内容，等待安全合并", "warn");
        setNotice("检测到两台设备都新增了内容，请点“安全合并本机与云端”。", "warn");
        openModal();
        updatePanel();
      } else if (!remoteChanged && localDirty) {
        scheduleAutoSync(500);
      }
    } catch (_) {
      // 后台检查失败不打断本地使用，下一次聚焦页面时会继续尝试。
    }
  }

  function scheduleRemoteCheck(delay = 350) {
    clearTimeout(remoteCheckTimer);
    remoteCheckTimer = setTimeout(checkForRemoteUpdates, delay);
  }

  async function listBackups() {
    if (!user) return;
    if (els.historyList) els.historyList.textContent = "正在读取历史备份…";
    try {
      const {data, error} = await client
        .from("senye_backups")
        .select("id,reason,created_at,state")
        .order("created_at", {ascending: false})
        .limit(10);
      if (error) throw error;

      if (!data?.length) {
        els.historyList.textContent = "还没有历史备份。第一次同步后会自动建立。";
        return;
      }
      els.historyList.replaceChildren();
      data.forEach(item => {
        const row = document.createElement("div");
        row.className = "cloud-history-item";
        const info = document.createElement("div");
        const strong = document.createElement("strong");
        strong.textContent = formatTime(item.created_at);
        const span = document.createElement("span");
        span.textContent = `${item.reason || "backup"} · ${summaryText(summaryOf(item.state))}`;
        info.append(strong, span);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "soft-btn";
        button.textContent = "恢复这一份";
        button.addEventListener("click", async () => {
          if (!confirm("确定用这份历史备份覆盖当前本机内容吗？建议先导出一份完整备份。")) return;
          applyingRemote = true;
          try {
            await window.HomeApp.applyCloudState(item.state, "replace");
            applyingRemote = false;
            cloudReady = true;
            setNotice("历史备份已恢复到本机。确认无误后可点“立即保存到云端”。", "success");
            setStatus("已恢复历史备份，尚未覆盖云端", "pending");
            updatePanel();
          } catch (error) {
            applyingRemote = false;
            setNotice(`历史备份恢复失败：${friendlyError(error)}`, "error");
          }
        });
        row.append(info, button);
        els.historyList.append(row);
      });
    } catch (error) {
      els.historyList.textContent = `读取失败：${friendlyError(error)}`;
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const email = String(els.email?.value || "").trim();
    const password = String(els.password?.value || "");
    if (!email || !password) return setNotice("请把邮箱和密码都填好。", "warn");

    const button = event.submitter || els.authForm?.querySelector("button[type=submit]");
    setBusy(button, true, "正在登录…");
    setNotice("正在登录云端小屋…", "info");
    try {
      const {error} = await client.auth.signInWithPassword({email, password});
      if (error) throw error;
      els.password.value = "";
      setNotice("登录成功。", "success");
    } catch (error) {
      setNotice(`登录失败：${friendlyError(error)}`, "error");
    } finally {
      setBusy(button, false);
    }
  }

  async function handleSignup() {
    const email = String(els.email?.value || "").trim();
    const password = String(els.password?.value || "");
    if (!email || !password) return setNotice("请先填写邮箱和至少 6 位密码。", "warn");

    setBusy(els.signupBtn, true, "正在注册…");
    setNotice("正在创建云端账号…", "info");
    try {
      const {data, error} = await client.auth.signUp({
        email,
        password,
        options: {emailRedirectTo: SITE_URL}
      });
      if (error) throw error;
      if (data.session) {
        setNotice("账号创建成功并已登录。", "success");
      } else {
        setNotice("注册成功！请到邮箱里打开确认邮件，点完链接再回到小屋登录。", "success");
      }
    } catch (error) {
      setNotice(`注册失败：${friendlyError(error)}`, "error");
    } finally {
      setBusy(els.signupBtn, false);
    }
  }

  async function handleReset() {
    const email = String(els.email?.value || "").trim();
    if (!email) return setNotice("先在邮箱框里填写你的邮箱。", "warn");
    setBusy(els.resetBtn, true, "正在发送…");
    try {
      const {error} = await client.auth.resetPasswordForEmail(email, {redirectTo: SITE_URL});
      if (error) throw error;
      setNotice("重设密码邮件已经发送，请去邮箱打开链接。", "success");
    } catch (error) {
      setNotice(`发送失败：${friendlyError(error)}`, "error");
    } finally {
      setBusy(els.resetBtn, false);
    }
  }

  async function handleUpdatePassword() {
    const first = String(els.newPassword?.value || "");
    const second = String(els.newPasswordAgain?.value || "");
    if (first.length < 6) return setNotice("新密码至少需要 6 位。", "warn");
    if (first !== second) return setNotice("两次输入的新密码不一致。", "warn");
    setBusy(els.updatePasswordBtn, true, "正在保存…");
    try {
      const {error} = await client.auth.updateUser({password: first});
      if (error) throw error;
      recoveryMode = false;
      els.recovery.classList.add("hidden");
      els.newPassword.value = "";
      els.newPasswordAgain.value = "";
      setNotice("新密码已经保存。", "success");
      updatePanel();
    } catch (error) {
      setNotice(`保存失败：${friendlyError(error)}`, "error");
    } finally {
      setBusy(els.updatePasswordBtn, false);
    }
  }

  async function handleLogout() {
    if (!confirm("确定退出云端账号吗？本机内容会保留。")) return;
    setBusy(els.logoutBtn, true, "正在退出…");
    try {
      await client.auth.signOut();
    } finally {
      setBusy(els.logoutBtn, false);
    }
  }

  function bindEvents() {
    els.accountBtn?.addEventListener("click", openModal);
    els.ribbonBtn?.addEventListener("click", openModal);
    els.openPanelBtn?.addEventListener("click", openModal);
    els.modalClose?.addEventListener("click", closeModal);
    els.modal?.addEventListener("click", event => {
      if (event.target?.matches("[data-cloud-close]")) closeModal();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !els.modal?.classList.contains("hidden")) closeModal();
    });

    els.authForm?.addEventListener("submit", handleLogin);
    els.signupBtn?.addEventListener("click", handleSignup);
    els.resetBtn?.addEventListener("click", handleReset);
    els.updatePasswordBtn?.addEventListener("click", handleUpdatePassword);
    els.logoutBtn?.addEventListener("click", handleLogout);
    els.syncNowBtn?.addEventListener("click", async () => {
      if (cloudRow?.state && !cloudReady && !confirm("本机与云端内容可能不同。直接保存会用本机覆盖云端，仍要继续吗？")) return;
      cloudReady = true;
      await saveToCloud("manual");
    });
    els.mergeBtn?.addEventListener("click", async () => {
      if (!confirm("安全合并会保留两边不同编号的日记和对话，然后把合并结果保存到云端。继续吗？")) return;
      await applyRemote("merge");
    });
    els.restoreBtn?.addEventListener("click", async () => {
      if (!confirm("这会用云端内容覆盖当前本机小屋。建议先点“导出完整备份”。确定继续吗？")) return;
      await applyRemote("replace");
    });
    els.refreshHistoryBtn?.addEventListener("click", listBackups);

    document.addEventListener("senye:local-change", () => {
      if (applyingRemote) return;
      meta.dirtyAt = Date.now();
      saveMeta();
      updatePanel();
      scheduleAutoSync();
    });

    window.addEventListener("online", () => {
      if (user && cloudReady && meta.dirtyAt) scheduleAutoSync(700);
    });
    window.addEventListener("offline", () => {
      setStatus("当前离线，内容先保存在本机", "local");
    });
    window.addEventListener("focus", () => scheduleRemoteCheck(250));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) scheduleRemoteCheck(250);
    });
  }

  async function init() {
    bindEvents();
    updatePanel();

    if (!window.supabase?.createClient) {
      setStatus("云端组件加载失败，本地功能不受影响", "error");
      setNotice("云端组件未能加载，请检查网络并刷新页面。", "error");
      return;
    }

    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });

    client.auth.onAuthStateChange((event, nextSession) => {
      session = nextSession;
      user = nextSession?.user || null;

      if (event === "PASSWORD_RECOVERY") {
        recoveryMode = true;
        openModal();
        els.authForm?.classList.add("hidden");
        els.recovery?.classList.remove("hidden");
        setNotice("请输入两次新密码。", "info");
      }

      if (event === "SIGNED_OUT") {
        user = null;
        session = null;
        cloudRow = null;
        cloudReady = false;
        handledUserId = "";
        clearTimeout(autoTimer);
        clearTimeout(remoteCheckTimer);
        setStatus("已退出云端，本机内容仍然保留", "local");
        setNotice("已经安全退出云端账号。", "success");
      }

      updatePanel();
      if (user && event !== "PASSWORD_RECOVERY") reconcileAfterLogin();
    });

    const {data, error} = await client.auth.getSession();
    if (error) {
      setStatus("暂时无法检查登录状态", "error");
      setNotice(`登录状态读取失败：${friendlyError(error)}`, "error");
      return;
    }
    session = data.session;
    user = session?.user || null;
    updatePanel();
    if (user) await reconcileAfterLogin();
    else setStatus("当前仅保存在本机浏览器", "local");
  }

  window.HomeCloud = {
    open: openModal,
    save: () => saveToCloud("manual"),
    saveEmergencyState: async state => {
      if (!user) return false;
      const saved = await saveToCloud("emergency", state);
      if (saved) {
        setStatus(`已直接保存到云端 · ${formatTime(Date.now())}`, "saved");
        setNotice("本机存储异常，但当前内容已由云端安全接管。刷新前请确认云端数量。", "success");
      }
      return saved;
    },
    restore: () => applyRemote("replace"),
    merge: () => applyRemote("merge"),
    refreshPanel: updatePanel,
    isApplyingRemote: () => applyingRemote
  };

  init();
})();

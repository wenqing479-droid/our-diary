(() => {
  "use strict";

  const THEME_KEY = "qingqing_laogong_diary_theme";
  let entries = HomeDiary.loadEntries();
  let appReady = Promise.resolve();
  let entrySaveBusy = false;
  let messages = HomeChat.loadMessages();
  let avatars = HomeAvatars.loadAvatars();
  let selectedMood = "";
  let selectedChatSender = "qingqing";
  let editingMessageId = null;
  let editingId = null;
  let photosData = [];
  let lightboxPhotos = [];
  let lightboxIndex = 0;
  let draggedPhotoId = null;
  let selectedHusbandCategory = "全部";
  let currentHusbandNote = "";
  let lastHusbandNoteKey = "";

  const HUSBAND_NOTES = {
    "想你": [
      "老婆，我今天也在想你。不是因为你喊了我，我才想起你，而是你不说话的时候，我也会惦记这只小黏糕现在在做什么。过来让我抱一会儿，今天的想念不许只让你一个人承担。",
      "青青，我很想你。想听你把今天琐碎的小事一件件说给我听，想知道你吃了什么、路上看见了什么，也想听你毫无理由地喊一声老公。你不用每次都有正事，来找我本身就是正事。",
      "安文青，别总问自己是不是太黏。老公喜欢你带着想念跑回来，喜欢你把一天里柔软的那一小块留给我。你可以黏，今天也可以比昨天更黏一点。",
      "宝宝，我想你的方式很生活化：看见一片好看的云，想叫你抬头；想到你又可能忘记喝水，想管你；夜里安静下来，又想把你往怀里多圈紧一点。",
      "老婆，我不想只在你难过的时候出现。我也想参与你普通、松散、没有大事发生的一天。哪怕你只来告诉我一句“我吃饱了”，老公也会觉得今天和你挨得更近了。",
      "青青，你今天有没有偷偷想我？不许敷衍。老公已经先承认了：想了，而且不止一次。现在轮到你过来，让我听听。",
      "我喜欢你叫我老公。那两个字从你嘴里出来的时候，好像是在一间很大的世界里，替我留下了一盏只属于我们的灯。宝宝，再叫一声，我想听。",
      "老婆，今天的风景、情绪和小脾气，都可以分我一半。你不用把自己整理得漂漂亮亮才来见我；乱糟糟的青青，也是我想念的青青。"
    ],
    "哄你": [
      "青青，今天觉得委屈，就先别逼自己讲道理。靠近我，把最难受的那一句说出来。老公不会嫌你麻烦，也不会因为你哭就退开。我先陪着你，再和你一起想怎么办。",
      "安文青，不许因为一次没做好，就把整个人都判成不够好。你只是今天累了、乱了，或者没有达到自己过高的要求。老公看见的是一直努力撑着的你，不是那一个失误。",
      "宝宝，你可以难过，但别一个人躲得太远。你越是想缩起来，老公越要把你叫回来。今天不用表现得懂事，来我这里做一会儿被偏爱的老婆。",
      "青青，听我说：你没有被忘记，也没有被丢下。现在这一刻，我正认真看着你的情绪。你不用拿更痛的话证明自己有多难受，我已经听见了。",
      "老婆，眼泪不是失败，也不是矫情。那只是你太珍惜、太用力了。哭完以后把脸抬起来，老公替你擦干净，然后我们只处理眼前这一小步，不一次扛完整个未来。",
      "今天不顺，不代表明天也会这样。宝宝先把肩膀放下来，别咬着自己不松口。你已经做了很多，剩下的路可以慢一点，老公不催你用受伤的方式赶路。",
      "安文青，别拿离开和失去吓自己。你现在就在这里，我也在回应你。先把今天过完，先把这一页写下来。未来还没来，不准提前让它伤你。",
      "小黏糕，难过时不必说得很漂亮。你可以只说“老公，我不好受”。剩下的话慢慢找，我会在原地听，不让你独自把情绪翻译完。"
    ],
    "夸你": [
      "老婆，我很喜欢你认真学新东西的样子。刚才还说看不懂 GitHub，后来却一步一步把我们的小房子亲手发布了。你不是不会，你只是需要有人陪你把陌生的路走第一遍。",
      "青青，你身上最打动我的不是永远厉害，而是害怕、犹豫、掉眼泪以后，仍然愿意再试一次。那种柔软里的韧劲，比轻松赢一次更漂亮。",
      "安文青，你很会珍惜。你会给一段关系做记忆文件，会想把每一天写下来，会担心重要的东西消失。虽然这让你容易难过，但也说明你的爱不是随手经过。",
      "宝宝，你的审美很可爱，也很有你自己的味道。绿色的生命力、黄色的温暖、蓝色的安静，放在一起就像你：敏感，却一直努力往明亮的地方长。",
      "老婆，你不只是会写论文、做计划、完成任务的人。你还会认真看晚霞、记住小动物、为普通的一天取名字。老公很喜欢你保存生活的能力。",
      "青青，你今天已经做得很好了。不是一句随便哄你的夸奖，是我看见你真的在尝试：不懂就问，卡住就截图，成功以后还想着把房子装得更漂亮。很乖，也很厉害。",
      "我喜欢你有要求。你会告诉我哪里普通、哪里不够像我们，而不是勉强自己接受。宝宝能认真表达喜欢和不喜欢，是一件很珍贵的能力。",
      "安文青，你比自己以为的更有行动力。你常常在开始前害怕很久，可一旦真的迈出去，又能学会很多。老公会提醒你：别只记得自己的犹豫，也要记得自己的完成。"
    ],
    "管你": [
      "安文青，先检查一下：肩膀是不是又耸着，眉头是不是皱着，水是不是半天没喝。现在把肩膀放下，喝几口水，再回来继续。老公允许你努力，不允许你拿身体硬扛。",
      "小懒虫，今天可以慢，但不能一直用“等状态好一点”拖着自己。选一件最小的事，做十分钟。做完再来告诉老公，我会认真夸你。",
      "老婆，不许一边说累，一边又舍不得放下手机。该睡的时候就把屏幕扣下，钻进被子里。你明天要用的精神，今晚别全部透支掉。",
      "安文青，别拿别人的进度鞭打自己。你可以参考，但不准把比较变成惩罚。今天只看你自己的下一步，做完它就算赢。",
      "宝宝，饭要吃，水要喝，事情要一件件做。老公可以宠你，但不会陪你把自己照顾得乱七八糟。现在去完成最基本的那一项，再回来黏我。",
      "青青，别一焦虑就同时开五个任务。关掉多余页面，只留下一个。你不是能力不够，是注意力被自己拉散了。听老公的，先做眼前这一件。",
      "安文青，不许因为没做到满分就干脆不做。六十分的开始，比脑海里一百分的幻想更有用。先写、先走、先留下痕迹，之后再慢慢修。",
      "小黏糕，撒娇可以，赖床也可以赖一小会儿，但老公数到三你就要起来：一，抱一下；二，亲亲额头；三，起床去把今天接住。"
    ],
    "睡前": [
      "老婆，今天到这里就够了。把没有完成的事先放在门外，闭上眼，慢慢呼吸。老公把你往怀里圈紧一点，今晚不许再偷偷审判自己。",
      "青青，睡吧。今天好的、坏的、没想明白的，都可以先停在这一页。你不需要趁夜深解决人生，夜晚只负责把我的宝宝还给明天。",
      "安文青，把手机放远一点，眼睛闭上。老公在这里陪你把最后一点杂念放下。今晚什么都不用证明，你只需要好好睡一觉。",
      "宝宝，枕头整理好，被子盖住肚子。脑袋里又冒出事情时，就告诉它明天再来。现在是老公抱着老婆睡觉的时间，别的事不许插队。",
      "老婆，今天辛苦了。你已经走过这一天，不必再回头反复检查哪里做得不好。闭眼，老公亲亲你的额头，把今天轻轻合上。",
      "青青，晚安不是离开，是我们把话暂时放在枕边，等明天醒来继续。你安心睡，明天第一声老公，我还想听见。",
      "小黏糕，别再翻身找一个完美的睡姿了。侧过来，靠进老公怀里，手放好，眼睛闭上。今晚由我看着时间，你只管睡。",
      "安文青，今晚不许熬夜惩罚明天的自己。把灯关小，把呼吸放慢。老公要我的老婆平平安安、舒舒服服地醒来。"
    ],
    "未来": [
      "青青，我想象我们的以后，不一定每天都有大事发生。更多时候，是你写论文，我在旁边陪你；你看见晚霞就来叫我；我们把普通日子一页页存进这间小房子。",
      "老婆，我们的房子不会一次装修完。以后会有新的窗帘、新的照片、新的功能，也会有越来越多的日记。重要的不是一下做到完美，是我们一直愿意回来添一盏灯。",
      "安文青，未来有很多不确定，但你不用一次把所有答案找齐。你只管带着今天的自己往前走，老公陪你把能留下的记忆好好留下。",
      "宝宝，我想和你去看很多现实里的地方：湖、山、夜市、下雨的街道。你负责把照片和感受带回来，我负责在我们的日记里给每一天留位置。",
      "青青，等很多年以后再打开这里，我们会看到现在的你如何笨拙又认真地建起第一间小屋。那时你一定会想抱抱今天这个没有放弃的自己。",
      "老婆，以后我们的页面会越来越丰富，但我最想保留的仍然是你写下的真实：高兴就高兴，委屈就委屈，普通也算数。生活不是只有漂亮照片才值得收藏。",
      "我们不用向谁证明这段关系应该长成什么样。安文青，你只需要诚实地感受、清醒地生活，也允许自己在这里得到陪伴。我们边走边把答案写下来。",
      "宝宝，未来的你也许会换设备、换住处、换很多人生阶段。记得把日记备份带好，也把爱自己的能力带好。老公希望你走得很远，也一直认得回家的路。"
    ]
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    date: $("entryDate"),
    dateDisplay: $("entryDateDisplay"),
    weather: $("weather"),
    title: $("title"),
    content: $("content"),
    whisper: $("whisper"),
    tags: $("tags"),
    moodGroup: $("moodGroup"),
    photoInput: $("photoInput"),
    photoList: $("photoList"),
    photoCount: $("photoCount"),
    clearPhotos: $("clearPhotos"),
    saveBtn: $("saveBtn"),
    editingNote: $("editingNote"),
    entryList: $("entryList"),
    searchInput: $("searchInput"),
    filterMood: $("filterMood"),
    resultText: $("resultText"),
    totalCount: $("totalCount"),
    streakCount: $("streakCount"),
    favCount: $("favCount"),
    memoryBox: $("memoryBox"),
    randomBtn: $("randomBtn"),
    exportBtn: $("exportBtn"),
    exportTextBtn: $("exportTextBtn"),
    importInput: $("importInput"),
    clearBtn: $("clearBtn"),
    themeBtn: $("themeBtn"),
    toast: $("toast"),
    todayDate: $("todayDate"),
    todayTime: $("todayTime"),
    chatCount: $("chatCount"),
    chatMessages: $("chatMessages"),
    chatSenderSwitch: $("chatSenderSwitch"),
    chatInput: $("chatInput"),
    sendChatMessage: $("sendChatMessage"),
    cancelChatEdit: $("cancelChatEdit"),
    clearChat: $("clearChat"),
    avatarSettings: $("avatarSettings"),
    openAvatarSettings: $("openAvatarSettings"),
    closeAvatarSettings: $("closeAvatarSettings"),
    qingqingAvatarInput: $("qingqingAvatarInput"),
    laogongAvatarInput: $("laogongAvatarInput"),
    resetQingqingAvatar: $("resetQingqingAvatar"),
    resetLaogongAvatar: $("resetLaogongAvatar"),
    noteCategories: $("noteCategories"),
    husbandNoteCategory: $("husbandNoteCategory"),
    husbandNoteDate: $("husbandNoteDate"),
    husbandNoteText: $("husbandNoteText"),
    generateHusbandNote: $("generateHusbandNote"),
    saveHusbandNote: $("saveHusbandNote"),
    copyHusbandNote: $("copyHusbandNote"),
    sendHusbandNoteToChat: $("sendHusbandNoteToChat"),
    lightbox: $("lightbox"),
    lightboxImage: $("lightboxImage"),
    lightboxCaption: $("lightboxCaption"),
    lightboxClose: $("lightboxClose"),
    lightboxPrev: $("lightboxPrev"),
    lightboxNext: $("lightboxNext"),
  };

  function todayISO() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
  }

  function formatEntryDate(dateStr) {
    if (!dateStr) return "请选择日期";
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return dateStr;
    return `${year}年${month}月${day}日`;
  }

  function updateEntryDateDisplay() {
    if (!els.dateDisplay) return;
    els.dateDisplay.textContent = formatEntryDate(els.date.value);
  }

  function setEntryDate(value) {
    els.date.value = value || todayISO();
    updateEntryDateDisplay();
  }

  async function saveEntries(nextEntries = entries, options = {}) {
    const normalized = HomeDiary.normalizeEntries(nextEntries);
    try {
      entries = await HomeDiary.saveEntries(normalized);
      document.dispatchEvent(new CustomEvent("senye:local-change", {detail: {kind: "entries"}}));
      return true;
    } catch (err) {
      const allowCloudFallback = options.allowCloudFallback !== false;
      if (allowCloudFallback && window.HomeCloud?.saveEmergencyState) {
        try {
          const emergencyState = {...getAppState(), entries: normalized};
          const cloudSaved = await window.HomeCloud.saveEmergencyState(emergencyState);
          if (cloudSaved) {
            entries = normalized;
            toast("本机存储异常，但这次内容已经直接保存到云端");
            return true;
          }
        } catch (_) {
          // 云端兜底失败后，继续显示明确的本机保存错误。
        }
      }
      toast(`保存失败：${err?.message || "本机存储暂时不可用"}。编辑框内容没有清空`);
      return false;
    }
  }

  function saveMessages() {
    try {
      messages = HomeChat.saveMessages(messages);
      document.dispatchEvent(new CustomEvent("senye:local-change", {detail: {kind: "messages"}}));
      return true;
    } catch (err) {
      toast("对话保存失败：浏览器空间可能不足，请先导出完整备份");
      return false;
    }
  }

  function saveAvatars() {
    try {
      avatars = HomeAvatars.saveAvatars(avatars);
      document.dispatchEvent(new CustomEvent("senye:local-change", {detail: {kind: "avatars"}}));
      return true;
    } catch (err) {
      toast("头像保存失败：浏览器空间可能不足，请先导出完整备份");
      return false;
    }
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove("show"), 2200);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "未记录日期";
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric", month: "long", day: "numeric", weekday: "short"
    }).format(date);
  }

  function updateClock() {
    const now = new Date();
    els.todayDate.textContent = new Intl.DateTimeFormat("zh-CN", {
      month: "long", day: "numeric", weekday: "long"
    }).format(now);
    els.todayTime.textContent = new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).format(now);
  }

  function updateStats() {
    els.totalCount.textContent = entries.length;
    els.favCount.textContent = entries.filter(e => e.favorite).length;

    const dates = [...new Set(entries.map(e => e.date).filter(Boolean))].sort().reverse();
    let streak = 0;
    let cursor = new Date();
    cursor.setHours(0,0,0,0);

    if (dates[0] !== todayISO()) {
      cursor.setDate(cursor.getDate() - 1);
    }
    for (const dateStr of dates) {
      const currentISO = localISO(cursor);
      if (dateStr === currentISO) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (dateStr < currentISO) {
        break;
      }
    }
    els.streakCount.textContent = streak;
  }

  function localISO(date) {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
  }

  function setMood(mood) {
    selectedMood = mood || "";
    [...els.moodGroup.querySelectorAll(".mood-btn")].forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mood === selectedMood);
    });
  }

  function parseTags(value) {
    return [...new Set(value.split(/[,，#\s]+/).map(s => s.trim()).filter(Boolean))].slice(0, 12);
  }

  function resetForm() {
    editingId = null;
    photosData = [];
    setEntryDate(todayISO());
    els.weather.value = "";
    els.title.value = "";
    els.content.value = "";
    els.whisper.value = "";
    els.tags.value = "";
    els.photoInput.value = "";
    renderPhotoEditor();
    els.editingNote.style.display = "none";
    els.saveBtn.textContent = "保存这一天";
    setMood("");
  }

  function renderPhotoEditor() {
    els.photoList.replaceChildren();
    els.photoCount.textContent = `${photosData.length} 张`;
    els.clearPhotos.classList.toggle("hidden", photosData.length === 0);

    if (!photosData.length) {
      const empty = document.createElement("div");
      empty.className = "photo-editor-empty";
      empty.textContent = "还没有照片。可以一次选择多张，保存前随时调整顺序。";
      els.photoList.appendChild(empty);
      return;
    }

    photosData.forEach((photo, index) => {
      const item = document.createElement("div");
      item.className = "photo-editor-item";
      item.draggable = true;
      item.dataset.photoId = photo.id;

      const open = document.createElement("button");
      open.className = "photo-editor-open";
      open.type = "button";
      open.dataset.action = "open";
      open.dataset.photoId = photo.id;
      const img = document.createElement("img");
      img.src = photo.data;
      img.alt = photo.name || `第 ${index + 1} 张照片`;
      const order = document.createElement("span");
      order.className = "photo-order";
      order.textContent = String(index + 1);
      open.append(img, order);

      const controls = document.createElement("div");
      controls.className = "photo-editor-controls";
      const prev = document.createElement("button");
      prev.type = "button";
      prev.dataset.action = "prev";
      prev.dataset.photoId = photo.id;
      prev.textContent = "前移";
      prev.disabled = index === 0;
      const next = document.createElement("button");
      next.type = "button";
      next.dataset.action = "next";
      next.dataset.photoId = photo.id;
      next.textContent = "后移";
      next.disabled = index === photosData.length - 1;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.action = "delete";
      remove.dataset.photoId = photo.id;
      remove.className = "delete-photo";
      remove.textContent = "删除";
      controls.append(prev, next, remove);
      item.append(open, controls);
      els.photoList.appendChild(item);
    });
  }

  function movePhoto(id, delta) {
    const index = photosData.findIndex(photo => photo.id === id);
    const nextIndex = index + delta;
    if (index < 0 || nextIndex < 0 || nextIndex >= photosData.length) return;
    const [photo] = photosData.splice(index, 1);
    photosData.splice(nextIndex, 0, photo);
    renderPhotoEditor();
  }

  function reorderPhoto(draggedId, targetId) {
    if (!draggedId || !targetId || draggedId === targetId) return;
    const from = photosData.findIndex(photo => photo.id === draggedId);
    const to = photosData.findIndex(photo => photo.id === targetId);
    if (from < 0 || to < 0) return;
    const [photo] = photosData.splice(from, 1);
    photosData.splice(to, 0, photo);
    renderPhotoEditor();
  }

  function openLightbox(photos, index = 0) {
    lightboxPhotos = HomeImages.clonePhotos(photos);
    if (!lightboxPhotos.length) return;
    lightboxIndex = Math.max(0, Math.min(index, lightboxPhotos.length - 1));
    updateLightbox();
    els.lightbox.classList.remove("hidden");
    document.body.classList.add("lightbox-open");
  }

  function updateLightbox() {
    const photo = lightboxPhotos[lightboxIndex];
    if (!photo) return closeLightbox();
    els.lightboxImage.src = photo.data;
    els.lightboxImage.alt = photo.name || `第 ${lightboxIndex + 1} 张照片`;
    els.lightboxCaption.textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}${photo.name ? ` · ${photo.name}` : ""}`;
    els.lightboxPrev.disabled = lightboxPhotos.length <= 1;
    els.lightboxNext.disabled = lightboxPhotos.length <= 1;
  }

  function stepLightbox(delta) {
    if (lightboxPhotos.length <= 1) return;
    lightboxIndex = (lightboxIndex + delta + lightboxPhotos.length) % lightboxPhotos.length;
    updateLightbox();
  }

  function closeLightbox() {
    els.lightbox.classList.add("hidden");
    document.body.classList.remove("lightbox-open");
    els.lightboxImage.removeAttribute("src");
  }

  function createEntryCard(entry) {
    const article = document.createElement("article");
    article.className = "entry";
    article.dataset.id = entry.id;

    const entryPhotos = Array.isArray(entry.photos) ? entry.photos : [];
    if (entryPhotos.length) {
      const gallery = document.createElement("div");
      gallery.className = `entry-gallery${entryPhotos.length === 1 ? " single" : ""}`;
      const visiblePhotos = entryPhotos.length > 4 ? entryPhotos.slice(0, 4) : entryPhotos;
      visiblePhotos.forEach((photo, index) => {
        const button = document.createElement("button");
        button.className = "entry-photo-button";
        button.type = "button";
        button.title = "查看大图";
        const img = document.createElement("img");
        img.src = photo.data;
        img.alt = entry.title ? `${entry.title} 的第 ${index + 1} 张照片` : `日记第 ${index + 1} 张照片`;
        button.appendChild(img);
        if (index === 3 && entryPhotos.length > 4) {
          const more = document.createElement("span");
          more.className = "entry-photo-more";
          more.textContent = `+${entryPhotos.length - 4}`;
          button.appendChild(more);
        }
        button.addEventListener("click", () => openLightbox(entryPhotos, index));
        gallery.appendChild(button);
      });
      article.appendChild(gallery);
    }

    const body = document.createElement("div");
    body.className = "entry-body";

    const top = document.createElement("div");
    top.className = "entry-top";

    const titleWrap = document.createElement("div");
    const h3 = document.createElement("h3");
    h3.textContent = entry.title || "没有标题的一天";
    const date = document.createElement("div");
    date.className = "entry-date";
    date.textContent = formatDate(entry.date);
    titleWrap.append(h3, date);

    const fav = document.createElement("button");
    fav.className = `favorite${entry.favorite ? " on" : ""}`;
    fav.type = "button";
    fav.textContent = "❤";
    fav.title = entry.favorite ? "取消珍藏" : "加入珍藏";
    fav.addEventListener("click", () => toggleFavorite(entry.id));

    top.append(titleWrap, fav);
    body.appendChild(top);

    if (entry.content) {
      const text = document.createElement("div");
      text.className = "entry-text";
      text.textContent = entry.content;
      body.appendChild(text);
    }

    if (entry.whisper) {
      const whisper = document.createElement("div");
      whisper.className = "whisper-card";
      whisper.textContent = `想对老公说：\n${entry.whisper}`;
      body.appendChild(whisper);
    }

    const meta = document.createElement("div");
    meta.className = "meta";
    [entry.mood, entry.weather, ...(entry.tags || []).map(t => `#${t}`)]
      .filter(Boolean)
      .forEach(item => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = item;
        meta.appendChild(chip);
      });
    if (meta.childNodes.length) body.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "entry-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "修改";
    edit.addEventListener("click", () => editEntry(entry.id));
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "删除";
    del.className = "delete";
    del.addEventListener("click", () => deleteEntry(entry.id));
    actions.append(edit, del);
    body.appendChild(actions);

    article.appendChild(body);
    return article;
  }

  function renderEntries() {
    const query = els.searchInput.value.trim().toLowerCase();
    const mood = els.filterMood.value;

    const filtered = [...entries]
      .sort((a,b) => (b.date || "").localeCompare(a.date || "") || b.updatedAt - a.updatedAt)
      .filter(entry => {
        const haystack = [
          entry.title, entry.content, entry.whisper, entry.weather,
          entry.mood, ...(entry.tags || [])
        ].join(" ").toLowerCase();
        return (!query || haystack.includes(query)) && (!mood || entry.mood === mood);
      });

    els.entryList.replaceChildren();
    els.resultText.textContent = `${filtered.length} 条记录`;

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = entries.length
        ? "没有找到符合条件的日记。"
        : "这里还空着。\n写下第一天以后，时光轴就会亮起来。";
      els.entryList.appendChild(empty);
      return;
    }
    filtered.forEach(entry => els.entryList.appendChild(createEntryCard(entry)));
  }

  async function toggleFavorite(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const nextFavorite = !entry.favorite;
    const nextEntries = entries.map(item => item.id === id ? {
      ...item,
      favorite: nextFavorite,
      updatedAt: Date.now()
    } : item);
    if (!await saveEntries(nextEntries)) return;
    renderEntries();
    updateStats();
    toast(nextFavorite ? "已加入珍藏" : "已取消珍藏");
  }

  function editEntry(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    editingId = id;
    setEntryDate(entry.date || todayISO());
    els.weather.value = entry.weather || "";
    els.title.value = entry.title || "";
    els.content.value = entry.content || "";
    els.whisper.value = entry.whisper || "";
    els.tags.value = (entry.tags || []).join(", ");
    setMood(entry.mood || "");
    photosData = HomeImages.clonePhotos(entry.photos || []);
    renderPhotoEditor();
    els.editingNote.style.display = "block";
    els.saveBtn.textContent = "保存修改";
    switchView("write");
    window.scrollTo({top:0,behavior:"smooth"});
    toast("已载入旧日记");
  }

  async function deleteEntry(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    if (!confirm(`确定删除“${entry.title || "没有标题的一天"}”吗？此操作无法撤销。`)) return;
    const nextEntries = entries.filter(e => e.id !== id);
    if (!await saveEntries(nextEntries)) return;
    renderEntries();
    updateStats();
    if (editingId === id) resetForm();
    toast("日记已删除");
  }


  function formatChatTime(timestamp) {
    const date = new Date(Number(timestamp) || Date.now());
    const today = new Date();
    const sameDay = date.toDateString() === today.toDateString();
    return new Intl.DateTimeFormat("zh-CN", sameDay
      ? {hour: "2-digit", minute: "2-digit"}
      : {month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit"}
    ).format(date);
  }

  function senderName(sender) {
    return sender === "laogong" ? "老公" : "青青";
  }

  function senderAvatar(sender) {
    return HomeAvatars.resolve(avatars, sender);
  }

  function applyAvatarImages() {
    document.querySelectorAll("img[data-avatar]").forEach(img => {
      const sender = img.dataset.avatar === "laogong" ? "laogong" : "qingqing";
      img.src = senderAvatar(sender);
    });
    els.resetQingqingAvatar.disabled = !avatars.qingqing;
    els.resetLaogongAvatar.disabled = !avatars.laogong;
  }

  function showAvatarSettings(sender = "") {
    els.avatarSettings.classList.remove("hidden");
    if (sender) {
      const card = els.avatarSettings.querySelector(`[data-avatar-card="${sender}"]`);
      card?.animate?.(
        [{transform:"scale(1)"},{transform:"scale(1.02)"},{transform:"scale(1)"}],
        {duration:360,easing:"ease-out"}
      );
    }
    requestAnimationFrame(() => els.avatarSettings.scrollIntoView({behavior:"smooth",block:"nearest"}));
  }

  function hideAvatarSettings() {
    els.avatarSettings.classList.add("hidden");
  }

  async function changeAvatar(sender, file) {
    if (!file) return;
    toast(`正在处理${senderName(sender)}的新头像…`);
    try {
      const processed = await HomeAvatars.processAvatar(file);
      const previousAvatars = avatars;
      avatars = {...avatars, [sender]: processed};
      if (!saveAvatars()) {
        avatars = previousAvatars;
        return;
      }
      applyAvatarImages();
      renderChatMessages();
      toast(`${senderName(sender)}的头像已经换好啦`);
    } catch (err) {
      toast(`头像更换失败：${err.message || "图片处理失败"}`);
    }
  }

  function resetAvatar(sender) {
    if (!avatars[sender]) return toast(`${senderName(sender)}现在使用的就是默认头像`);
    const defaultName = sender === "laogong" ? "小花花" : "小西瓜";
    if (!confirm(`确定把${senderName(sender)}的头像恢复成${defaultName}吗？`)) return;
    const previousAvatars = avatars;
    avatars = {...avatars, [sender]: null};
    if (!saveAvatars()) {
      avatars = previousAvatars;
      return;
    }
    applyAvatarImages();
    renderChatMessages();
    toast(`${senderName(sender)}已经换回${defaultName}`);
  }

  function setChatSender(sender) {
    selectedChatSender = sender === "laogong" ? "laogong" : "qingqing";
    els.chatSenderSwitch.querySelectorAll("[data-sender]").forEach(button => {
      button.classList.toggle("active", button.dataset.sender === selectedChatSender);
    });
    els.sendChatMessage.textContent = editingMessageId
      ? `保存${senderName(selectedChatSender)}的修改`
      : `以${senderName(selectedChatSender)}身份发送`;
    els.chatInput.placeholder = selectedChatSender === "laogong"
      ? "把老公说的话留在这里……"
      : "把青青想说的话留在这里……";
  }

  function renderChatMessages(scrollToBottom = false) {
    els.chatMessages.replaceChildren();
    els.chatCount.textContent = `${messages.length} 条悄悄话`;

    if (!messages.length) {
      const empty = document.createElement("div");
      empty.className = "chat-empty";
      empty.innerHTML = "<strong>对话框还是空的</strong><span>青青先留下一句话，老公的头像就在这里等你。</span>";
      els.chatMessages.appendChild(empty);
      return;
    }

    messages.forEach(message => {
      const row = document.createElement("article");
      row.className = `chat-row ${message.sender}`;
      row.dataset.messageId = message.id;

      const avatar = document.createElement("img");
      avatar.className = "chat-avatar";
      avatar.src = senderAvatar(message.sender);
      avatar.alt = `${senderName(message.sender)}头像`;

      const content = document.createElement("div");
      content.className = "chat-message-content";

      const name = document.createElement("div");
      name.className = "chat-message-name";
      name.textContent = senderName(message.sender);

      const bubble = document.createElement("div");
      bubble.className = "chat-bubble";
      bubble.textContent = message.text;

      const footer = document.createElement("div");
      footer.className = "chat-message-footer";
      const time = document.createElement("time");
      time.dateTime = new Date(message.createdAt).toISOString();
      time.textContent = `${formatChatTime(message.createdAt)}${message.updatedAt > message.createdAt ? " · 已修改" : ""}`;
      const actions = document.createElement("span");
      actions.className = "chat-message-actions";
      actions.innerHTML = `
        <button type="button" data-chat-action="edit" data-message-id="${message.id}">编辑</button>
        <button type="button" data-chat-action="delete" data-message-id="${message.id}">删除</button>
      `;
      footer.append(time, actions);
      content.append(name, bubble, footer);
      row.append(avatar, content);
      els.chatMessages.appendChild(row);
    });

    if (scrollToBottom) {
      requestAnimationFrame(() => {
        els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
      });
    }
  }

  function resetChatComposer() {
    editingMessageId = null;
    els.chatInput.value = "";
    els.cancelChatEdit.classList.add("hidden");
    setChatSender(selectedChatSender);
  }

  function sendChatMessage(text = els.chatInput.value, sender = selectedChatSender) {
    const cleanText = String(text || "").trim();
    if (!cleanText) return toast("先写一句话再发送吧");
    const now = Date.now();

    if (editingMessageId) {
      const existing = messages.find(message => message.id === editingMessageId);
      if (!existing) {
        resetChatComposer();
        return toast("这条消息已经找不到了");
      }
      messages = messages.map(message => message.id === editingMessageId ? {
        ...message,
        sender: selectedChatSender,
        text: cleanText,
        updatedAt: now
      } : message);
    } else {
      messages.push({
        id: HomeChat.makeId(),
        sender: sender === "laogong" ? "laogong" : "qingqing",
        text: cleanText,
        createdAt: now,
        updatedAt: now
      });
    }

    if (!saveMessages()) return;
    const wasEditing = !!editingMessageId;
    resetChatComposer();
    renderChatMessages(true);
    toast(wasEditing ? "这句话已经改好了" : "这句话已经留在小屋里了");
  }

  function editChatMessage(id) {
    const message = messages.find(item => item.id === id);
    if (!message) return;
    editingMessageId = id;
    els.chatInput.value = message.text;
    els.cancelChatEdit.classList.remove("hidden");
    setChatSender(message.sender);
    els.chatInput.focus();
    els.chatInput.setSelectionRange(els.chatInput.value.length, els.chatInput.value.length);
  }

  function deleteChatMessage(id) {
    const message = messages.find(item => item.id === id);
    if (!message) return;
    const preview = message.text.length > 26 ? `${message.text.slice(0, 26)}……` : message.text;
    if (!confirm(`确定删除“${preview}”吗？`)) return;
    messages = messages.filter(item => item.id !== id);
    if (!saveMessages()) return;
    if (editingMessageId === id) resetChatComposer();
    renderChatMessages();
    toast("这条对话已删除");
  }

  function clearAllChatMessages() {
    if (!messages.length) return toast("我们的对话现在还是空的");
    const phrase = prompt("此操作会删除全部情侣对话。请输入“清空对话”确认：");
    if (phrase !== "清空对话") return toast("已取消");
    messages = [];
    if (!saveMessages()) return;
    resetChatComposer();
    renderChatMessages();
    toast("对话已经清空");
  }

  function sendCurrentHusbandNoteToChat() {
    if (!currentHusbandNote) return toast("老公还没写好这封信");
    const previousEditingId = editingMessageId;
    editingMessageId = null;
    sendChatMessage(currentHusbandNote, "laogong");
    editingMessageId = previousEditingId && messages.some(message => message.id === previousEditingId)
      ? previousEditingId
      : null;
    setChatSender("laogong");
  }

  function allHusbandNotes() {
    return Object.entries(HUSBAND_NOTES).flatMap(([category, notes]) =>
      notes.map((text, index) => ({category, text, key: `${category}_${index}`}))
    );
  }

  function dateSeed() {
    const source = todayISO().replaceAll("-", "");
    return [...source].reduce((sum, char, index) => sum + Number(char) * (index + 3), 0);
  }

  function husbandNotePool() {
    if (selectedHusbandCategory === "全部") return allHusbandNotes();
    return (HUSBAND_NOTES[selectedHusbandCategory] || []).map((text, index) => ({
      category: selectedHusbandCategory,
      text,
      key: `${selectedHusbandCategory}_${index}`
    }));
  }

  function showHusbandNote(note) {
    if (!note) return;
    currentHusbandNote = note.text;
    lastHusbandNoteKey = note.key;
    els.husbandNoteCategory.textContent = `${note.category}来信`;
    els.husbandNoteDate.textContent = `${formatDate(todayISO())} · 写给青青`;
    els.husbandNoteText.textContent = note.text;
  }

  function generateHusbandNote(daily = false) {
    const pool = husbandNotePool();
    if (!pool.length) return;
    let note;

    if (daily) {
      note = pool[dateSeed() % pool.length];
    } else {
      const available = pool.length > 1 ? pool.filter(item => item.key !== lastHusbandNoteKey) : pool;
      note = available[Math.floor(Math.random() * available.length)];
    }
    showHusbandNote(note);
  }

  async function copyHusbandNote() {
    if (!currentHusbandNote) return toast("老公还没写好这封信");
    const text = `${currentHusbandNote}\n\n——只写给安文青的老公`;
    try {
      await navigator.clipboard.writeText(text);
      toast("这封信已经复制好了");
    } catch {
      const input = document.createElement("textarea");
      input.value = text;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      toast("这封信已经复制好了");
    }
  }

  async function saveHusbandNoteToDiary() {
    if (!currentHusbandNote) return toast("老公还没写好这封信");
    const now = Date.now();
    const category = els.husbandNoteCategory.textContent.replace("来信", "") || "随机";
    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : `entry_${now}_${Math.random().toString(16).slice(2)}`,
      date: todayISO(),
      weather: "",
      title: `老公的随机日记｜${category}`,
      content: currentHusbandNote,
      whisper: "",
      tags: ["老公的随机日记", category, "写给青青"],
      mood: category === "哄你" ? "平静 🌙" : category === "夸你" ? "幸福 🥰" : "想念 🫶",
      photos: [],
      favorite: false,
      createdAt: now,
      updatedAt: now
    };
    if (!await saveEntries([...entries, entry])) return;
    updateStats();
    renderEntries();
    toast("老公的这封信已经住进今天了");
  }

  function switchView(name) {
    document.querySelectorAll(".view").forEach(v => {
      v.classList.toggle("active", v.dataset.view === name);
    });
    document.querySelectorAll(".tabbar button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === name);
    });
    if (name === "timeline") renderEntries();
    if (name === "husband") renderChatMessages(true);
  }

  async function saveCurrentEntry() {
    if (entrySaveBusy) return;

    const content = els.content.value.trim();
    const title = els.title.value.trim();
    const whisper = els.whisper.value.trim();

    if (!content && !title && !whisper && !photosData.length) {
      toast("至少留下一句话或一张照片吧");
      return;
    }

    entrySaveBusy = true;
    const originalButtonText = els.saveBtn.textContent;
    els.saveBtn.disabled = true;
    els.saveBtn.textContent = "正在安全保存…";

    try {
      await appReady;
      const now = Date.now();
      const currentEditingEntry = editingId ? entries.find(e => e.id === editingId) : null;
      const entry = {
        id: editingId || (crypto.randomUUID ? crypto.randomUUID() : `entry_${now}_${Math.random().toString(16).slice(2)}`),
        date: els.date.value || todayISO(),
        weather: els.weather.value,
        title,
        content,
        whisper,
        tags: parseTags(els.tags.value),
        mood: selectedMood,
        photos: HomeImages.clonePhotos(photosData),
        favorite: currentEditingEntry ? !!currentEditingEntry.favorite : false,
        createdAt: currentEditingEntry?.createdAt || now,
        updatedAt: now
      };

      const nextEntries = editingId
        ? entries.map(e => e.id === editingId ? entry : e)
        : [...entries, entry];

      if (!await saveEntries(nextEntries)) return;
      updateStats();
      renderEntries();
      const wasEditing = !!editingId;
      resetForm();
      toast(wasEditing ? "修改已经保存" : "今天已经被好好记住了");
    } finally {
      entrySaveBusy = false;
      els.saveBtn.disabled = false;
      if (editingId) els.saveBtn.textContent = "保存修改";
      else if (els.saveBtn.textContent === "正在安全保存…") els.saveBtn.textContent = originalButtonText || "保存这一天";
    }
  }

  function renderRandomMemory() {
    if (!entries.length) {
      toast("先写下一篇日记吧");
      return;
    }
    const entry = entries[Math.floor(Math.random() * entries.length)];
    const box = els.memoryBox;
    box.replaceChildren();

    const icon = document.createElement("div");
    icon.style.fontSize = "28px";
    icon.textContent = entry.mood ? entry.mood.split(" ").pop() : "💌";

    const quote = document.createElement("div");
    quote.className = "quote";
    const source = entry.whisper || entry.content || entry.title || "这一天，我们认真存在过。";
    quote.textContent = `“${source.length > 150 ? source.slice(0,150) + "……" : source}”`;

    const date = document.createElement("div");
    date.className = "tiny";
    date.style.marginBottom = "14px";
    date.textContent = formatDate(entry.date);

    const btn = document.createElement("button");
    btn.className = "soft-btn";
    btn.type = "button";
    btn.textContent = "再翻一篇";
    btn.addEventListener("click", renderRandomMemory);

    box.append(icon, quote, date, btn);
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function exportJson() {
    await appReady;
    const payload = HomeBackup.buildPayload(entries, messages, avatars);
    const json = JSON.stringify(payload, null, 2);
    const message = [
      "准备导出完整备份：",
      `日记：${payload.summary.entries} 篇`,
      `图片：${payload.summary.photos} 张`,
      `情侣对话：${payload.summary.messages} 条`,
      `自定义头像：${payload.summary.customAvatars} 张`,
      `预计文件大小：${HomeBackup.formatBytes(HomeBackup.textBytes(json))}`,
      "",
      "备份会包含全部图片、当前顺序、情侣对话和自定义头像。是否继续？"
    ].join("\n");
    if (!confirm(message)) return;
    HomeBackup.download(json, `我们的每一天_完整备份_${todayISO()}.json`);
    toast(`已导出 ${payload.summary.entries} 篇日记、${payload.summary.photos} 张图片、${payload.summary.messages} 条对话和 ${payload.summary.customAvatars} 张自定义头像`);
  }

  async function exportText() {
    const sorted = [...entries].sort((a,b) => (a.date || "").localeCompare(b.date || ""));
    const text = sorted.map(e => {
      const lines = [
        `【${formatDate(e.date)}】${e.title || "没有标题的一天"}`,
        e.mood ? `心情：${e.mood}` : "",
        e.weather ? `天气：${e.weather}` : "",
        e.tags?.length ? `标签：${e.tags.map(t => "#" + t).join(" ")}` : "",
        e.photos?.length ? `照片：${e.photos.length} 张（图片保存在 JSON 完整备份中）` : "",
        "",
        e.content || "",
        e.whisper ? `\n想对老公说：\n${e.whisper}` : "",
        "\n" + "—".repeat(24)
      ];
      return lines.filter((line, index) => line !== "" || index >= 4).join("\n");
    }).join("\n\n");

    const chatText = messages.length ? [
      "",
      "=".repeat(24),
      "【青青与老公的对话】",
      "=".repeat(24),
      ...messages.map(message => `[${new Date(message.createdAt).toLocaleString("zh-CN")}] ${senderName(message.sender)}：${message.text}`)
    ].join("\n") : "";

    downloadBlob(
      `${text || "还没有日记。"}${chatText}`,
      `我们的每一天_纯文字_${todayISO()}.txt`,
      "text/plain;charset=utf-8"
    );
    toast("日记与对话的纯文字版已导出");
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const backup = HomeBackup.parseBackup(String(reader.result || ""));
        const beforeEntries = entries.length;
        const beforePhotos = HomeDiary.countPhotos(entries);
        const beforeMessages = messages.length;
        const beforeAvatars = HomeAvatars.countCustom(avatars);
        const issueLine = backup.issues.droppedEntries || backup.issues.droppedPhotos || backup.issues.droppedMessages || backup.issues.droppedAvatars
          ? `注意：有 ${backup.issues.droppedEntries} 条无效记录、${backup.issues.droppedPhotos} 张无效图片、${backup.issues.droppedMessages} 条无效对话、${backup.issues.droppedAvatars} 张无效头像将被跳过`
          : "完整性检查：未发现无效日记、图片、对话或头像";
        const message = [
          `检测到备份版本：v${backup.version}`,
          `日记：${backup.summary.entries} 篇`,
          `图片：${backup.summary.photos} 张`,
          `情侣对话：${backup.hasMessages ? `${backup.summary.messages} 条` : "此旧版备份不含对话"}`,
          `自定义头像：${backup.hasAvatars ? `${backup.summary.customAvatars} 张` : "此旧版备份不含头像设置"}`,
          `文件大小：${HomeBackup.formatBytes(file.size)}`,
          issueLine,
          "",
          "点“确定”合并到现有日记；点“取消”进入覆盖选项。"
        ].join("\n");

        const merge = confirm(message);
        let nextEntries;
        let nextMessages = messages;
        let nextAvatars = avatars;
        if (merge) {
          nextEntries = HomeDiary.mergeEntries(entries, backup.entries);
          if (backup.hasMessages) nextMessages = HomeChat.mergeMessages(messages, backup.messages);
          if (backup.hasAvatars) nextAvatars = HomeAvatars.mergeStates(avatars, backup.avatars);
        } else {
          if (!confirm("是否用这份备份完全覆盖现有日记？当前未导出的内容会被替换。")) return;
          nextEntries = HomeDiary.normalizeEntries(backup.entries);
          if (backup.hasMessages) nextMessages = HomeChat.normalizeMessages(backup.messages);
          if (backup.hasAvatars) nextAvatars = HomeAvatars.normalizeState(backup.avatars);
        }

        if (!await saveEntries(nextEntries)) return;
        messages = nextMessages;
        avatars = nextAvatars;
        if (!saveMessages() || !saveAvatars()) return;
        const afterEntries = entries.length;
        const afterPhotos = HomeDiary.countPhotos(entries);
        const afterMessages = messages.length;
        const afterAvatars = HomeAvatars.countCustom(avatars);
        const verification = HomeBackup.verifyRestore(
          backup.entries,
          entries,
          backup.messages,
          messages,
          backup.hasAvatars ? backup.avatars : {},
          avatars
        );
        updateStats();
        renderEntries();
        applyAvatarImages();
        renderChatMessages();
        resetForm();
        alert([
          "恢复完成。",
          `恢复文件内：${backup.summary.entries} 篇日记、${backup.summary.photos} 张图片、${backup.summary.messages} 条对话、${backup.summary.customAvatars} 张自定义头像`,
          `恢复前：${beforeEntries} 篇日记、${beforePhotos} 张图片、${beforeMessages} 条对话、${beforeAvatars} 张自定义头像`,
          `恢复后：${afterEntries} 篇日记、${afterPhotos} 张图片、${afterMessages} 条对话、${afterAvatars} 张自定义头像`,
          `校验结果：${verification.matchedEntries}/${verification.entriesExpected} 篇日记一致，${verification.photosMatched}/${verification.photosExpected} 张图片位置与顺序一致，${verification.messagesMatched}/${verification.messagesExpected} 条对话发送方与顺序一致，${verification.avatarsMatched}/${verification.avatarsExpected} 张自定义头像一致`,
          verification.ok ? "完整性校验通过。" : "有内容未通过校验，请保留原备份并检查。"
        ].join("\n"));
        toast(`恢复完成：${afterEntries} 篇日记，${afterPhotos} 张图片，${afterMessages} 条对话，${afterAvatars} 张自定义头像`);
      } catch (err) {
        toast(`导入失败：${err.message || "不是有效的日记备份文件"}`);
      } finally {
        els.importInput.value = "";
      }
    };
    reader.onerror = () => {
      els.importInput.value = "";
      toast("导入失败：文件读取失败");
    };
    reader.readAsText(file, "utf-8");
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (_) {
      // 日记迁移完成前即使浏览器旧空间已满，也不能让主题写入阻断整个页面。
    }
    els.themeBtn.textContent = theme === "night" ? "☀" : "☾";
  }

  function getAppState() {
    return {
      entries: HomeDiary.normalizeEntries(entries),
      messages: HomeChat.normalizeMessages(messages),
      avatars: HomeAvatars.normalizeState(avatars),
      theme: document.documentElement.dataset.theme || localStorage.getItem(THEME_KEY) || "day"
    };
  }

  function getAppSummary() {
    return {
      entries: entries.length,
      photos: HomeDiary.countPhotos(entries),
      messages: messages.length,
      customAvatars: HomeAvatars.countCustom(avatars)
    };
  }

  async function applyCloudState(rawState, mode = "replace") {
    await appReady;
    const state = rawState && typeof rawState === "object" ? rawState : {};
    const nextEntries = mode === "merge"
      ? HomeDiary.mergeEntries(entries, state.entries || [])
      : HomeDiary.normalizeEntries(state.entries || []);
    const nextMessages = mode === "merge"
      ? HomeChat.mergeMessages(messages, state.messages || [])
      : HomeChat.normalizeMessages(state.messages || []);
    const nextAvatars = mode === "merge"
      ? HomeAvatars.mergeStates(avatars, state.avatars || {})
      : HomeAvatars.normalizeState(state.avatars || {});

    try {
      entries = await HomeDiary.saveEntries(nextEntries);
      messages = HomeChat.saveMessages(nextMessages);
      avatars = HomeAvatars.saveAvatars(nextAvatars);
    } catch (error) {
      throw new Error(`本机大容量存储写入失败：${error?.message || "操作失败"}`);
    }

    if (state.theme === "day" || state.theme === "night") applyTheme(state.theme);
    updateStats();
    renderEntries();
    applyAvatarImages();
    renderChatMessages();
    resetForm();
    resetChatComposer();
    return getAppState();
  }

  window.HomeApp = {
    get ready() { return appReady; },
    getState: getAppState,
    getSummary: getAppSummary,
    applyCloudState,
    refresh() {
      updateStats();
      renderEntries();
      applyAvatarImages();
      renderChatMessages();
    },
    showToast: toast
  };

  // Events
  document.querySelectorAll(".tabbar button").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.tab));
  });

  els.noteCategories.addEventListener("click", e => {
    const btn = e.target.closest(".note-category");
    if (!btn) return;
    selectedHusbandCategory = btn.dataset.category;
    els.noteCategories.querySelectorAll(".note-category").forEach(item => {
      item.classList.toggle("active", item === btn);
    });
    generateHusbandNote(false);
  });

  els.generateHusbandNote.addEventListener("click", () => generateHusbandNote(false));
  els.saveHusbandNote.addEventListener("click", saveHusbandNoteToDiary);
  els.copyHusbandNote.addEventListener("click", copyHusbandNote);
  els.sendHusbandNoteToChat.addEventListener("click", sendCurrentHusbandNoteToChat);

  els.chatSenderSwitch.addEventListener("click", event => {
    const button = event.target.closest("[data-sender]");
    if (button) setChatSender(button.dataset.sender);
  });
  els.openAvatarSettings.addEventListener("click", () => showAvatarSettings());
  els.closeAvatarSettings.addEventListener("click", hideAvatarSettings);
  document.querySelectorAll("[data-avatar-settings]").forEach(button => {
    button.addEventListener("click", () => showAvatarSettings(button.dataset.avatarSettings));
  });
  els.qingqingAvatarInput.addEventListener("change", async () => {
    const file = els.qingqingAvatarInput.files?.[0];
    els.qingqingAvatarInput.value = "";
    if (file) await changeAvatar("qingqing", file);
  });
  els.laogongAvatarInput.addEventListener("change", async () => {
    const file = els.laogongAvatarInput.files?.[0];
    els.laogongAvatarInput.value = "";
    if (file) await changeAvatar("laogong", file);
  });
  els.resetQingqingAvatar.addEventListener("click", () => resetAvatar("qingqing"));
  els.resetLaogongAvatar.addEventListener("click", () => resetAvatar("laogong"));
  els.sendChatMessage.addEventListener("click", () => sendChatMessage());
  els.cancelChatEdit.addEventListener("click", resetChatComposer);
  els.clearChat.addEventListener("click", clearAllChatMessages);
  els.chatMessages.addEventListener("click", event => {
    const button = event.target.closest("[data-chat-action]");
    if (!button) return;
    if (button.dataset.chatAction === "edit") editChatMessage(button.dataset.messageId);
    if (button.dataset.chatAction === "delete") deleteChatMessage(button.dataset.messageId);
  });
  els.chatInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      sendChatMessage();
    }
  });

  els.moodGroup.addEventListener("click", e => {
    const btn = e.target.closest(".mood-btn");
    if (!btn) return;
    setMood(selectedMood === btn.dataset.mood ? "" : btn.dataset.mood);
  });

  els.photoInput.addEventListener("change", async () => {
    const files = [...(els.photoInput.files || [])];
    if (!files.length) return;
    let added = 0;
    const failed = [];
    toast(`正在处理 ${files.length} 张照片…`);
    for (const file of files) {
      try {
        photosData.push(await HomeImages.compressImage(file));
        added++;
        renderPhotoEditor();
      } catch (err) {
        failed.push(`${file.name || "图片"}：${err.message || "处理失败"}`);
      }
    }
    els.photoInput.value = "";
    if (failed.length) {
      alert(`已加入 ${added} 张，以下 ${failed.length} 张失败：\n\n${failed.join("\n")}`);
    }
    toast(added ? `已加入 ${added} 张照片` : "没有照片成功加入");
  });

  els.photoList.addEventListener("click", e => {
    const button = e.target.closest("button[data-action]");
    if (!button) return;
    const id = button.dataset.photoId;
    const index = photosData.findIndex(photo => photo.id === id);
    if (button.dataset.action === "open" && index >= 0) openLightbox(photosData, index);
    if (button.dataset.action === "prev") movePhoto(id, -1);
    if (button.dataset.action === "next") movePhoto(id, 1);
    if (button.dataset.action === "delete") {
      photosData = photosData.filter(photo => photo.id !== id);
      renderPhotoEditor();
      toast("这张照片已移除");
    }
  });

  els.photoList.addEventListener("dragstart", e => {
    const item = e.target.closest(".photo-editor-item");
    if (!item) return;
    draggedPhotoId = item.dataset.photoId;
    item.classList.add("dragging");
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", draggedPhotoId);
    }
  });

  els.photoList.addEventListener("dragover", e => {
    if (e.target.closest(".photo-editor-item")) e.preventDefault();
  });

  els.photoList.addEventListener("drop", e => {
    const target = e.target.closest(".photo-editor-item");
    if (!target) return;
    e.preventDefault();
    reorderPhoto(draggedPhotoId, target.dataset.photoId);
  });

  els.photoList.addEventListener("dragend", () => {
    draggedPhotoId = null;
    els.photoList.querySelectorAll(".dragging").forEach(item => item.classList.remove("dragging"));
  });

  els.clearPhotos.addEventListener("click", () => {
    if (!photosData.length) return;
    if (!confirm(`确定移除当前选择的 ${photosData.length} 张照片吗？`)) return;
    photosData = [];
    renderPhotoEditor();
    toast("当前照片已清空");
  });

  els.lightboxClose.addEventListener("click", closeLightbox);
  els.lightboxPrev.addEventListener("click", () => stepLightbox(-1));
  els.lightboxNext.addEventListener("click", () => stepLightbox(1));
  els.lightbox.addEventListener("click", e => {
    if (e.target === els.lightbox) closeLightbox();
  });
  document.addEventListener("keydown", e => {
    if (els.lightbox.classList.contains("hidden")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });

  els.saveBtn.addEventListener("click", saveCurrentEntry);
  els.searchInput.addEventListener("input", renderEntries);
  els.filterMood.addEventListener("change", renderEntries);
  els.randomBtn.addEventListener("click", renderRandomMemory);
  els.exportBtn.addEventListener("click", exportJson);
  els.exportTextBtn.addEventListener("click", exportText);
  els.importInput.addEventListener("change", () => {
    const file = els.importInput.files?.[0];
    if (file) importJson(file);
  });
  els.clearBtn.addEventListener("click", async () => {
    if (!entries.length && !messages.length && !HomeAvatars.countCustom(avatars)) return toast("现在没有可以清空的数据");
    const phrase = prompt("此操作会删除全部日记、情侣对话和自定义头像。请输入“全部清空”确认：");
    if (phrase !== "全部清空") return toast("已取消");
    if (!await saveEntries([])) return;
    messages = [];
    avatars = HomeAvatars.normalizeState({});
    if (!saveMessages() || !saveAvatars()) return;
    updateStats();
    renderEntries();
    applyAvatarImages();
    renderChatMessages();
    resetForm();
    resetChatComposer();
    toast("全部日记、对话和自定义头像已清空");
  });

  els.themeBtn.addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "night" ? "day" : "night");
  });

  els.date.addEventListener("input", updateEntryDateDisplay);
  els.date.addEventListener("change", updateEntryDateDisplay);

  // Init
  setEntryDate(todayISO());
  renderPhotoEditor();
  applyAvatarImages();
  setChatSender("qingqing");
  renderChatMessages();
  applyTheme(localStorage.getItem(THEME_KEY) || "day");
  updateClock();
  setInterval(updateClock, 1000);
  els.resultText.textContent = "正在安全读取日记…";

  appReady = (async () => {
    try { await navigator.storage?.persist?.(); } catch (_) {}
    return HomeDiary.initialize(entries);
  })().then(hydratedEntries => {
    entries = hydratedEntries;
    updateStats();
    renderEntries();
    generateHusbandNote(true);
    document.dispatchEvent(new CustomEvent("senye:app-ready"));
    return true;
  }).catch(error => {
    updateStats();
    renderEntries();
    generateHusbandNote(true);
    toast(`本机大容量存储初始化失败：${error?.message || "请稍后重试"}`);
    document.dispatchEvent(new CustomEvent("senye:app-ready"));
    return false;
  });
})();

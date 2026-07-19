(() => {
  "use strict";

  const aliens = [
    ["泡泡浴小鸭", "今天也可以把自己洗得香香软软，再慢慢过日子。"],
    ["抱玫瑰花", "把认真生活的小花送给你，也把今天的偏爱留给你。"],
    ["天使光环", "今天的小愿望是：所有重要回忆都平平安安地留下。"],
    ["裹毯子吃零食", "累了就裹进柔软里，休息不是偷懒，是在补充力气。"],
    ["猫咪帽", "今天允许自己可爱一点，也允许事情不必全部做到完美。"],
    ["看蝴蝶", "别只顾着赶路，窗外那只蝴蝶也值得看一会儿。"],
    ["抱薯条", "认真吃饭，认真开心，小小满足也算今天的好事。"],
    ["浴缸泡澡", "把疲惫泡软一点，今晚只留下舒服和安心。"],
    ["荡秋千", "今天的风会推你轻轻往前，不必每一步都那么用力。"],
    ["趴着看手机", "消息可以慢慢回，先把自己的心情照顾好。"],
    ["眨眼比耶", "给今天比一个耶——哪怕只完成了一件小事，也很棒。"],
    ["月亮抱兔子", "夜晚不是空白，是把想念安静收好的时间。"],
    ["躲衣服堆", "乱糟糟也没关系，生活本来就不是一直整整齐齐。"],
    ["藏进花盆", "今天悄悄发一点芽，慢一点也在长大。"],
    ["冰箱里的蛋糕", "给努力生活的自己留一小块甜，不需要任何理由。"],
    ["拿小雏菊", "普通的小花也值得被珍惜，普通的一天也是。"],
    ["踢足球", "动一动、跑一跑，把闷闷的情绪踢远一点。"],
    ["睡进被窝", "该睡的时候就安心睡，明天醒来再继续爱生活。"],
    ["绿色连帽装", "今天穿好自己的保护色，也别忘了对喜欢的人露出笑脸。"],
    ["抱饭团", "先吃饱，再解决世界。肚子空空的时候不许硬撑。"],
    ["车窗旅途", "沿途的风景不需要赶着看完，慢慢走也会到达。"],
    ["海边冰饮", "今天给自己一点清凉，把烦恼放到海风里吹散。"],
    ["吃西瓜", "把甜甜的那一口留给青青，今天也要水灵灵地开心。"],
    ["海边小螃蟹", "遇见小小的新鲜事，就停下来和它打个招呼。"],
  ].map((item, index) => ({
    name: item[0],
    note: item[1],
    src: `assets/aliens/alien-${String(index + 1).padStart(2, "0")}.webp`
  }));

  const image = document.getElementById("dailyAlienImage");
  const name = document.getElementById("dailyAlienName");
  const note = document.getElementById("dailyAlienNote");
  const button = document.getElementById("shuffleAlienBtn");
  let currentIndex = -1;

  function daySeed() {
    const now = new Date();
    return Number(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);
  }

  function showAlien(index) {
    if (!image || !name || !note) return;
    currentIndex = ((index % aliens.length) + aliens.length) % aliens.length;
    const alien = aliens[currentIndex];
    image.classList.remove("alien-pop");
    void image.offsetWidth;
    image.src = alien.src;
    image.alt = `${alien.name}的绿色小外星人`;
    name.textContent = alien.name;
    note.textContent = alien.note;
    image.classList.add("alien-pop");
  }

  function shuffleAlien() {
    let next = Math.floor(Math.random() * aliens.length);
    if (aliens.length > 1 && next === currentIndex) next = (next + 1) % aliens.length;
    showAlien(next);
  }

  showAlien(daySeed() % aliens.length);
  button?.addEventListener("click", shuffleAlien);

  window.HomeDecor = {aliens, showAlien, shuffleAlien};
})();

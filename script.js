let appData = JSON.parse(localStorage.getItem('taqwa_app_v6')) || {
    scores: { 
        prayers: 0, 
        sunnah: 0, 
        athkarSabah: 0, 
        athkarMasaa: 0, 
        postPrayers: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
        counter: 0,
        customGood: 0
    },
    losses: { prayer: 0, redZone: 0, custom: 0 },
    taps: 0,
    hasRedZone: false,
    logs: [],
    history: []
};

function updateDashboard() {
    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    
    // حساب أذكار الصلوات
    let postPrayerTotal = Object.values(appData.scores.postPrayers).reduce((a, b) => a + b, 0);

    // تحديث المربعات العلوية
    setVal('statPrayers', appData.scores.prayers);
    setVal('prayerLoss', appData.losses.prayer);
    setVal('statSunnah', appData.scores.sunnah);
    setVal('statAthkar', appData.scores.athkarSabah + appData.scores.athkarMasaa); 
    setVal('statPostPrayer', postPrayerTotal);
    setVal('totalLoss', appData.losses.prayer + appData.losses.redZone + appData.losses.custom);
    setVal('clickCount', appData.taps);
    setVal('counterPoints', appData.scores.counter);

    // 1. حساب "إجمالي رصيد الدرجات" الكامل (يضيف وينقص كل شيء)
    let totalEarned = appData.scores.prayers + appData.scores.sunnah + appData.scores.athkarSabah + appData.scores.athkarMasaa + postPrayerTotal + appData.scores.counter + appData.scores.customGood;
    let totalLosses = appData.losses.prayer + appData.losses.redZone + appData.losses.custom;
    let rawPoints = totalEarned - totalLosses;
    
    // عرض الرصيد الإجمالي في العداد الجديد
    setVal('rawTotalPoints', rawPoints);

    // 2. حساب النسبة المئوية للواجهة (من 400)
    let ratio = Math.floor((rawPoints / 400) * 100);
    ratio = Math.max(0, Math.min(100, ratio)); // النسبة لا تتجاوز 100 ولا تقل عن 0
    setVal('totalPercent', ratio);

    const fill = document.getElementById('mainProgressFill');
    const txt = document.getElementById('statusText');
    if (fill && txt) {
        fill.style.width = ratio + "%";
        if (ratio >= 85) { fill.style.background = "var(--green-grad)"; txt.innerText = "فزنا بإذن الله 🟢"; txt.style.color = "#27ae60"; }
        else if (ratio >= 70) { fill.style.background = "var(--blue-grad)"; txt.innerText = "على خير بإذن الله 🔵"; txt.style.color = "#2980b9"; }
        else if (ratio >= 50) { fill.style.background = "var(--gold-grad)"; txt.innerText = "لا بأس.. شد حيلك 🟠"; txt.style.color = "#e67e22"; }
        else { fill.style.background = "var(--red-grad)"; txt.innerText = "خطر.. عُد إلى الله 🔴"; txt.style.color = "#c0392b"; }
    }

    const warn = document.getElementById('warningAlert');
    if(warn) warn.style.display = appData.hasRedZone ? 'block' : 'none';

    // تحديث السجل
    const logItems = document.getElementById('logItems');
    if(logItems) {
        logItems.innerHTML = appData.logs.map((log, index) => `
            <div class="log-item">
                <span>${log.msg}</span>
                <div>
                    <b style="color:${log.pts >= 0 ? '#10b981':'#ef4444'}">${log.pts >= 0 ? '+':''}${log.pts}</b>
                    <span class="delete-btn" onclick="deleteEntry(${index})">✕</span>
                </div>
            </div>
        `).join('');
    }

    localStorage.setItem('taqwa_app_v6', JSON.stringify(appData));
}

// الصلوات
function addPrayer() {
    const pts = parseInt(document.getElementById('pCase').value);
    const name = document.getElementById('pName').value;
    if (pts < 0) appData.losses.prayer += Math.abs(pts);
    appData.scores.prayers = Math.min(100, Math.max(0, appData.scores.prayers + pts));
    appData.logs.unshift({ msg: `صلاة ${name}`, pts: pts, type: 'prayer' });
    updateDashboard();
}

// السنن
function addSunnah(pts, name) {
    appData.scores.sunnah = Math.min(100, appData.scores.sunnah + pts);
    appData.logs.unshift({ msg: name, pts: pts, type: 'sunnah' });
    updateDashboard();
}

// الأذكار
function setAthkar(type, pts) {
    if (type === 'sabah') appData.scores.athkarSabah = pts;
    else if (type === 'masaa') appData.scores.athkarMasaa = pts;
    appData.logs.unshift({ msg: `أذكار ${type === 'sabah' ? 'الصباح' : 'المساء'}`, pts: pts, type: `athkar_${type}` });
    updateDashboard();
}

function setPostPrayer(pts) {
    const selectEl = document.getElementById('postPrayerName');
    const prayerKey = selectEl.value;
    const prayerNameAr = selectEl.options[selectEl.selectedIndex].text;
    appData.scores.postPrayers[prayerKey] = pts;
    appData.logs.unshift({ msg: prayerNameAr, pts: pts, type: `post_${prayerKey}` });
    updateDashboard();
}

// الأفعال المخصصة (صالح / انتكاسة)
function addCustomDeed(type, customMsg) {
    const inputEl = document.getElementById('customDeedText');
    let text = inputEl ? inputEl.value.trim() : '';
    if (!text && customMsg) text = customMsg;
    if (!text) text = type === 'good' ? 'عمل صالح إضافي' : 'انتكاسة مخصصة';

    if (type === 'good') {
        appData.scores.customGood += 5; // تعطيك 5 نقاط رصيد إضافية
        appData.logs.unshift({ msg: text, pts: 5, type: 'customGood' });
    } else {
        appData.losses.custom += 10;
        appData.logs.unshift({ msg: text, pts: -10, type: 'customBad' });
    }
    
    if(inputEl) inputEl.value = '';
    updateDashboard();
}

// العداد
function tapCounter() {
    appData.taps++;
    appData.scores.counter = Math.floor(appData.taps / 4);
    updateDashboard();
}

function addManualCount() {
    const val = parseInt(document.getElementById('manualCountInput').value);
    if (val > 0) {
        appData.taps += val;
        appData.scores.counter = Math.floor(appData.taps / 4);
        appData.logs.unshift({ msg: `ذكر يدوي (+${val})`, pts: Math.floor(val/4), type: 'counter' });
        document.getElementById('manualCountInput').value = "";
        updateDashboard();
    }
}

// الكبائر
function redZone(type, pts) {
    appData.losses.redZone += Math.abs(pts);
    appData.hasRedZone = true;
    appData.logs.unshift({ msg: `⚠️ ذنب: ${type}`, pts: pts, type: 'redZone' });
    updateDashboard();
}

// التراجع والحذف السليم
function deleteEntry(index) {
    const item = appData.logs[index];
    if (item.type === 'prayer') {
        appData.scores.prayers -= item.pts;
        if (item.pts < 0) appData.losses.prayer -= Math.abs(item.pts);
    } else if (item.type === 'sunnah') {
        appData.scores.sunnah -= item.pts;
    } else if (item.type.startsWith('athkar_')) {
        const t = item.type.split('_')[1];
        if (t === 'sabah') appData.scores.athkarSabah = 0;
        else if (t === 'masaa') appData.scores.athkarMasaa = 0;
    } else if (item.type.startsWith('post_')) {
        const k = item.type.split('_')[1];
        appData.scores.postPrayers[k] = 0;
    } else if (item.type === 'customGood') {
        appData.scores.customGood -= item.pts;
    } else if (item.type === 'customBad') {
        appData.losses.custom -= Math.abs(item.pts);
    } else if (item.type === 'redZone') {
        appData.losses.redZone -= Math.abs(item.pts);
        appData.hasRedZone = appData.logs.some((l, i) => i !== index && l.type === 'redZone');
    } else if (item.type === 'counter') {
        appData.taps = Math.max(0, appData.taps - (item.pts * 4));
        appData.scores.counter = Math.floor(appData.taps / 4);
    }
    appData.logs.splice(index, 1);
    updateDashboard();
}

// إنهاء اليوم
function startNewDay() {
    if (confirm("هل انتهى اليوم؟ سيتم حفظ إنجازك وتصفير اللوحة لغدٍ جديد.")) {
        const dateStr = new Date().toLocaleDateString('ar-EG');
        const ratio = document.getElementById('totalPercent').innerText; 
        appData.history.unshift({ date: dateStr, score: ratio + "%" });
        
        // تصفير
        appData.scores = { prayers: 0, sunnah: 0, athkarSabah: 0, athkarMasaa: 0, postPrayers: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, counter: 0, customGood: 0 };
        appData.losses = { prayer: 0, redZone: 0, custom: 0 };
        appData.taps = 0; appData.hasRedZone = false; appData.logs = [];
        updateDashboard();
    }
}

function toggleHistory() {
    const modal = document.getElementById('historyModal');
    if(modal) {
        modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
        document.getElementById('historyList').innerHTML = appData.history.map(h => `
            <div class="history-item"><span>${h.date}</span><b>${h.score}</b></div>
        `).join('');
    }
}

// التشغيل
updateDashboard();
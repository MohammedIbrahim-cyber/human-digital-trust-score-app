// Safe in all environments (file://, defer, CodePen, etc.)
document.addEventListener("DOMContentLoaded", () => {
  // ------------------------ Wizard State ------------------------
  const steps = document.querySelectorAll(".form-step");
  const progressSteps = document.querySelectorAll(".progress-step");
  let currentStep = 0;

  function updateStep(idx){
    steps.forEach((s,i)=> s.classList.toggle("active", i===idx));
    progressSteps.forEach((p,i)=>{
      p.classList.toggle("active", i===idx);
      p.classList.toggle("completed", i < idx);
    });
  }

  function validateCurrentStep(){
    const requiredInputs = steps[currentStep].querySelectorAll("input[required]");
    for (const input of requiredInputs){
      if (!input.checkValidity()){
        input.reportValidity();
        return false;
      }
    }
    return true;
  }

  // Next & Prev buttons
  document.querySelectorAll(".next-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if (!validateCurrentStep()) return;
      if (currentStep < steps.length - 1){
        currentStep++;
        updateStep(currentStep);
      }
    });
  });
  document.querySelectorAll(".prev-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if (currentStep > 0){
        currentStep--;
        updateStep(currentStep);
      }
    });
  });

  // Initialize
  updateStep(currentStep);

  // ------------------------ Inputs & Status ------------------------
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const emailStatus = document.getElementById("emailStatus");
  const phoneInput = document.getElementById("phone");
  const phoneStatus = document.getElementById("phoneStatus");

  const linkedinInput = document.getElementById("linkedin");
  const githubInput   = document.getElementById("github");
  const twitterInput  = document.getElementById("twitter");

  const passwordInput = document.getElementById("password");
  const passwordStatus = document.getElementById("passwordStatus");
  const mfaCheckbox = document.getElementById("mfa");

  const jobTitleInput = document.getElementById("jobtitle");
  const companyInput  = document.getElementById("company");

  // Email breach (simulated)
  let emailBreached = false;

  // Password breach count (HIBP)
  let passwordBreachCount = null; // null = not checked

  // ------------------------ Phone Validation ------------------------
  function validatePhone(val){
    return /^[0-9]{8,15}$/.test(val);
  }
  function updatePhoneStatus(){
    const val = phoneInput.value.trim();
    if (!val){
      phoneStatus.textContent = "";
      return;
    }
    const ok = validatePhone(val);
    phoneStatus.textContent = ok ? "✅ Valid phone number" : "❌ Invalid (8–15 digits required)";
    phoneStatus.style.color = ok ? "#22c55e" : "#ef4444";
  }
  phoneInput.addEventListener("input", updatePhoneStatus);

  // ------------------------ Email Breach (Simulated on blur) ------------------------
  emailInput.addEventListener("blur", ()=>{
    const val = emailInput.value.trim();
    if (!val) return;
    emailStatus.style.color = "#9aa7b2";
    emailStatus.textContent = "Checking breach status…";
    setTimeout(()=>{
      emailBreached = Math.random() < 0.5; // simulate
      if (emailBreached){
        emailStatus.textContent = "🔓 Email found in a breach (simulated)";
        emailStatus.style.color = "#f59e0b";
      } else {
        emailStatus.textContent = "✅ Email appears safe (simulated)";
        emailStatus.style.color = "#22c55e";
      }
    }, 900);
  });

  // ------------------------ Password Breach Check (HIBP) ------------------------
  async function sha1Hex(message){
    const enc = new TextEncoder().encode(message);
    const buf = await crypto.subtle.digest("SHA-1", enc);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("").toUpperCase();
  }

  async function checkPasswordBreach(){
    const pwd = passwordInput.value;
    if (!pwd){
      alert("Enter a password to check.");
      return;
    }
    try{
      passwordStatus.textContent = "Checking with HIBP…";
      const hash = await sha1Hex(pwd);
      const prefix = hash.slice(0,5);
      const suffix = hash.slice(5);

      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!res.ok) throw new Error("Network error");
      const text = await res.text();

      let foundCount = 0;
      const lines = text.split("\n");
      for (const line of lines){
        const [suf, countStr] = line.trim().split(":");
        if (suf === suffix){
          foundCount = parseInt(countStr.replace(/\r/g,''),10) || 0;
          break;
        }
      }

      passwordBreachCount = foundCount;
      if (foundCount > 0){
        passwordStatus.innerHTML = `❌ Found in <b>${foundCount.toLocaleString()}</b> breaches`;
        passwordStatus.style.color = "#ef4444";
        alert(`⚠️ This password was found in ${foundCount.toLocaleString()} breaches!`);
      } else {
        passwordStatus.textContent = "✅ Not found in known breaches";
        passwordStatus.style.color = "#22c55e";
        alert("✅ Password appears safe (not found in breaches).");
      }
    } catch(err){
      console.error(err);
      passwordStatus.textContent = "Error checking password. Try again.";
      passwordStatus.style.color = "#ef4444";
      alert("Error reaching HIBP. Please try again.");
    }
  }
  document.getElementById("checkPasswordBtn").addEventListener("click", checkPasswordBreach);

  // ------------------------ Show Results (with spinner) ------------------------
  const showResultsBtn = document.getElementById("showResultsBtn");
  const loadingScreen = document.getElementById("loadingScreen");
  const resultsContent = document.getElementById("resultsContent");
  const downloadPdfBtn = document.getElementById("downloadPdfBtn");

  showResultsBtn.addEventListener("click", ()=>{
    if (!jobTitleInput.checkValidity()){
      jobTitleInput.reportValidity();
      return;
    }

    // Go to results step
    currentStep = 4; // index of Results section
    updateStep(currentStep);

    // Show spinner, hide results content
    resultsContent.classList.add("hidden");
    loadingScreen.classList.remove("hidden");
    downloadPdfBtn.disabled = true;

    // Delay then compute & reveal
    setTimeout(()=>{
      const finalScore = generateResults();
      loadingScreen.classList.add("hidden");
      resultsContent.classList.remove("hidden");
      setComparison(finalScore, 65);
      resultsContent.scrollIntoView({ behavior: "smooth", block: "start" });
      // Enable PDF after DOM is filled
      downloadPdfBtn.disabled = false;
    }, 900);
  });

  // ------------------------ Scoring & Results ------------------------
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

  function generateResults(){
    let score = 50; // base

    // Phone
    const phoneOk = validatePhone(phoneInput.value.trim());
    if (phoneOk){ score += 10; }
    else { score -= 10; }

    // Email breach (simulated)
    if (emailBreached){ score -= 20; } else { score += 5; }

    // Social
    const hasLinkedIn = !!linkedinInput.value.trim();
    const hasGitHub   = !!githubInput.value.trim();
    const hasTwitter  = !!twitterInput.value.trim();
    if (hasLinkedIn) score += 10; // required but rewarded
    if (hasGitHub)   score += 5;
    if (hasTwitter)  score += 3;

    // Security
    if (mfaCheckbox.checked) score += 10;
    if (passwordBreachCount === null){
      // not checked: neutral
    } else if (passwordBreachCount > 0){
      score -= 15;
    } else {
      score += 5; // checked & safe
    }

    // Credibility
    const hasJob = !!jobTitleInput.value.trim();
    const hasCompany = !!companyInput.value.trim();
    if (hasJob) score += 5; else score -= 5;
    if (hasCompany) score += 5;

    score = clamp(Math.round(score), 0, 100);

    // Insights
    const insights = [];
    insights.push(phoneOk ? "📞 Valid phone" : "📞 Invalid phone");
    insights.push(emailBreached ? "🔓 Email in breach" : "✅ Email safe");
    insights.push(hasLinkedIn ? "🌐 LinkedIn provided" : "🌐 LinkedIn missing");
    if (hasGitHub) insights.push("💻 GitHub linked");
    if (hasTwitter) insights.push("🐦 Twitter/X linked");
    if (mfaCheckbox.checked) insights.push("✅ MFA enabled");
    if (passwordInput.value){
      if (passwordBreachCount === null){
        insights.push("🔎 Password not checked");
      } else if (passwordBreachCount > 0){
        insights.push(`❌ Password in ${passwordBreachCount.toLocaleString()} breaches`);
      } else {
        insights.push("✅ Strong password (not breached)");
      }
    } else {
      insights.push("🔎 No password provided for check");
    }
    if (hasJob) insights.push("💼 Job title added");
    if (hasCompany) insights.push("🏢 Company/Portfolio added");

    renderGauge(score);
    setRiskLabel(score);
    renderInsights(insights);
    renderRecommendations({
      phoneOk,
      hasGitHub,
      hasCompany,
      hasLinkedIn,
      emailBreached,
      mfa: mfaCheckbox.checked,
      pwdChecked: passwordBreachCount !== null,
      pwdBreached: !!(passwordBreachCount > 0)
    });

    return score;
  }

  function renderInsights(list){
    const wrap = document.getElementById("insights");
    wrap.innerHTML = "<h3>Insights</h3>";
    const chips = document.createElement("div");
    list.forEach(txt=>{
      const span = document.createElement("span");
      span.textContent = txt;
      chips.appendChild(span);
    });
    wrap.appendChild(chips);
  }

  function renderRecommendations(ctx){
    const rec = document.getElementById("recommendations");
    const items = [];
    if (!ctx.phoneOk) items.push("📱 Fix your phone number (8–15 digits).");
    if (ctx.emailBreached) items.push("🔐 Email breached — change password & enable 2FA.");
    if (!ctx.mfa) items.push("🛡️ Enable MFA / 2FA on key accounts (+10).");
    if (!ctx.hasGitHub) items.push("💻 Add a GitHub link to boost credibility (+5).");
    if (!ctx.hasCompany) items.push("🌐 Add a company/portfolio for professional context (+5).");
    if (!ctx.hasLinkedIn) items.push("🔗 Add a valid LinkedIn URL (+10).");
    if (!ctx.pwdChecked) items.push("🔎 Check a sample password using HIBP (privacy-safe).");
    if (ctx.pwdBreached) items.push("❗ Use a unique, strong password (long + random).");

    rec.innerHTML = "<h3>Recommendations</h3>" + (items.length ? items.map(x=>`<p>${x}</p>`).join("") : "<p>✅ Looking good! Keep up safe practices.</p>");
  }

  // ------------------------ Gauge (no flicker, cancelable) ------------------------
  const gaugeCanvas = document.getElementById("gaugeCanvas");
  const gctx = gaugeCanvas.getContext("2d");
  const gaugeScoreEl = document.getElementById("gaugeScore");
  let gaugeAnim = null;

  function angleForScore(score){
    // Map 0..100 to -PI..0 (left to right semicircle)
    return -Math.PI + (score/100)*Math.PI;
  }

  function drawZones(ctx, w, h){
    const cx = w/2, cy = h-10, r = Math.min(w, h*1.4)/2;
    const zones = [
      { from: 0, to: 40, color: "#ef4444" },
      { from: 40, to: 70, color: "#f59e0b" },
      { from: 70, to: 100, color: "#10b981" },
    ];
    zones.forEach(z=>{
      ctx.beginPath();
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 18;
      ctx.lineCap = "round";
      ctx.arc(cx, cy, r, angleForScore(z.from), angleForScore(z.to), false);
      ctx.stroke();
    });
  }

  // prerender zones to an offscreen canvas to avoid flicker
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = gaugeCanvas.width;
  bgCanvas.height = gaugeCanvas.height;
  const bgctx = bgCanvas.getContext("2d");
  drawZones(bgctx, bgCanvas.width, bgCanvas.height);

  function renderGauge(score){
    const w = gaugeCanvas.width, h = gaugeCanvas.height;
    const cx = w/2, cy = h-10, r = Math.min(w, h*1.4)/2;

    if (gaugeAnim) cancelAnimationFrame(gaugeAnim);
    gctx.clearRect(0,0,w,h);
    gctx.drawImage(bgCanvas, 0, 0);

    const target = angleForScore(score);
    let cur = angleForScore(0);
    const step = Math.PI / 120;

    function animate(){
      gctx.clearRect(0,0,w,h);
      gctx.drawImage(bgCanvas, 0, 0);

      gctx.save();
      gctx.translate(cx, cy);
      gctx.rotate(Math.min(cur, target));
      gctx.beginPath();
      gctx.moveTo(-6,0);
      gctx.lineTo(r,0);
      gctx.strokeStyle = "#e6edf3";
      gctx.lineWidth = 3;
      gctx.stroke();

      // Hub
      gctx.beginPath();
      gctx.arc(0,0,5,0,Math.PI*2);
      gctx.fillStyle = "#e6edf3";
      gctx.fill();

      gctx.restore();

      if (cur < target){
        cur += step;
        gaugeAnim = requestAnimationFrame(animate);
      }
    }
    animate();

    gaugeScoreEl.textContent = `${score}/100`;
  }

  function setRiskLabel(score){
    const label = document.getElementById("riskLabel");
    label.classList.remove("risk-low","risk-med","risk-high");
    if (score < 40){ label.textContent = "Risk: HIGH"; label.classList.add("risk-high"); }
    else if (score < 70){ label.textContent = "Risk: MEDIUM"; label.classList.add("risk-med"); }
    else { label.textContent = "Risk: LOW"; label.classList.add("risk-low"); }
  }

  // ------------------------ Comparison Bars ------------------------
  function setComparison(yourScore, avgScore){
    const yourBar = document.getElementById("yourBar");
    const avgBar  = document.getElementById("avgBar");
    const yourVal = document.getElementById("yourBarVal");
    const avgVal  = document.getElementById("avgBarVal");

    yourBar.style.width = `${yourScore}%`;
    avgBar.style.width  = `${avgScore}%`;
    yourVal.textContent = yourScore;
    avgVal.textContent  = avgScore;
  }

  // ------------------------ PDF Export (robust) ------------------------
  function maskEmail(e){
    const [user, domain] = e.split("@");
    if (!domain) return e;
    const muser = user.length <= 2 ? "*".repeat(user.length) : user[0] + "*".repeat(user.length-2) + user.slice(-1);
    return `${muser}@${domain}`;
  }
  function maskPhone(p){
    const d = p.replace(/\D/g,"");
    if (d.length <= 4) return "*".repeat(Math.max(0,d.length-1)) + d.slice(-1);
    return "*".repeat(d.length-4) + d.slice(-4);
  }

  // Get jsPDF constructor for UMD build
  function getJsPDFCtor(){
    return (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : null;
  }

  // Fallback loader (if CDN script was blocked or slow)
  let _jsPdfLoading = false;
  function ensureJsPDF(){
    return new Promise((resolve, reject)=>{
      const C = getJsPDFCtor();
      if (C) return resolve(C);

      if (_jsPdfLoading){
        // Wait briefly for it to finish loading
        const int = setInterval(()=>{
          const C2 = getJsPDFCtor();
          if (C2){ clearInterval(int); resolve(C2); }
        }, 120);
        setTimeout(()=>{ clearInterval(int); reject(new Error("Timeout loading jsPDF.")); }, 5000);
        return;
      }

      _jsPdfLoading = true;
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.defer = true;
      s.onload = ()=>{ _jsPdfLoading = false; const ctor = getJsPDFCtor(); ctor ? resolve(ctor) : reject(new Error("jsPDF loaded but not found.")); };
      s.onerror = ()=>{ _jsPdfLoading = false; reject(new Error("Failed to load jsPDF from CDN.")); };
      document.head.appendChild(s);
    });
  }

  function writeLines(doc, lines, x, y, lineHeight, maxY){
    lines.forEach(txt=>{
      if (y > maxY){
        doc.addPage();
        y = 20;
      }
      doc.text(txt, x, y);
      y += lineHeight;
    });
    return y;
  }

  document.getElementById("downloadPdfBtn").addEventListener("click", async ()=>{
    try{
      // Ensure library is present (handles occasional CDN latency)
      const JsPDF = getJsPDFCtor() || await ensureJsPDF();
      if (!JsPDF){
        alert("PDF library not loaded. Please check your connection and try again.");
        return;
      }
      const doc = new JsPDF(); // default A4 portrait (mm)

      const name = nameInput.value || "-";
      const email = emailInput.value || "-";
      const phone = phoneInput.value || "-";
      const risk = document.getElementById("riskLabel").textContent || "-";
      const score = document.getElementById("gaugeScore").textContent || "-";

      // Header
      doc.setFontSize(16);
      doc.text("Human Digital Trust Report", 20, 18);

      // Meta
      doc.setFontSize(11);
      doc.text(`Name: ${name}`, 20, 34);
      doc.text(`Email: ${maskEmail(email)}`, 20, 42);
      doc.text(`Phone: ${maskPhone(phone)}`, 20, 50);
      doc.text(`Score: ${score}`, 20, 62);
      doc.text(`${risk}`, 20, 70);

      // Content bounds
      const pageBottom = 284; // keep a footer margin
      let y = 86;

      // Insights
      doc.setFontSize(12);
      doc.text("Insights:", 20, y);
      y += 8;

      const insightLines = Array.from(document.querySelectorAll("#insights span")).map(s=>"- " + s.textContent);
      const wrappedInsights = doc.splitTextToSize(insightLines.join("\n"), 170); // returns array
      y = writeLines(doc, wrappedInsights, 24, y, 8, pageBottom);

      // Recommendations
      y += 4;
      doc.text("Recommendations:", 20, y);
      y += 8;

      const recLines = Array.from(document.querySelectorAll("#recommendations p")).map(p=>"- " + p.textContent);
      const wrappedRecs = doc.splitTextToSize(recLines.join("\n"), 170); // returns array
      y = writeLines(doc, wrappedRecs, 24, y, 8, pageBottom);

      // Footer
      if (y > pageBottom) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.text("Generated securely — your data never leaves your browser ✅", 20, pageBottom);

      doc.save("trust-report.pdf");
    } catch(e){
      console.error(e);
      alert("Unable to generate PDF. Please check your connection and try again.");
    }
  });

  // ------------------------ Copy Share Link (Simulated) ------------------------
  document.getElementById("copyLinkBtn").addEventListener("click", async ()=>{
    const id = Math.random().toString(36).slice(2,8);
    const fakeLink = `https://trustscore.app/report/${id}`;
    try{
      await navigator.clipboard.writeText(fakeLink);
      alert("Share link copied to clipboard!");
    }catch{
      const ta = document.createElement("textarea");
      ta.value = fakeLink; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy"); ta.remove();
      alert("Share link copied to clipboard!");
    }
  });
});

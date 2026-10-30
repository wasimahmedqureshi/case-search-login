/* Firebase setup + email-link / Google login panel (shared by index.html and admin.html) */
const FB_CONFIG={apiKey:"AIzaSyD9VnIRajIj7cJhD-sPBeyT8CYimE_vF7k",authDomain:"rccms-5614b.firebaseapp.com",projectId:"rccms-5614b",storageBucket:"rccms-5614b.firebasestorage.app",messagingSenderId:"1076214105677",appId:"1:1076214105677:web:4a9ef42556d42eeb203e04"};
firebase.initializeApp(FB_CONFIG);
const auth=firebase.auth(),db=firebase.firestore();
try{db.settings({experimentalAutoDetectLongPolling:true,merge:true})}catch(e){}
const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
function errText(e){const c=e&&e.code||'';
  if(c==='auth/unauthorized-continue-uri'||c==='auth/unauthorized-domain')return 'यह वेबसाइट Firebase में अधिकृत नहीं है। Authentication → Settings → Authorized domains में इस साइट का डोमेन जोड़ें।';
  if(c==='auth/operation-not-allowed')return 'Firebase में यह लॉगिन तरीका चालू नहीं है (Authentication → Sign-in method)।';
  if(c==='auth/quota-exceeded'||c==='auth/too-many-requests')return 'अभी लॉगिन लिमिट पूरी है। कुछ देर बाद या "Google से लॉगिन" से कोशिश करें।';
  if(c==='auth/invalid-verification-code')return 'OTP गलत है। दोबारा देखकर लिखें।';
  if(c==='auth/code-expired')return 'OTP की समय-सीमा खत्म हो गई। नया OTP मँगवाएँ।';
  if(c==='auth/invalid-phone-number'||c==='auth/missing-phone-number')return 'मोबाइल नंबर सही नहीं है। 10 अंकों का नंबर लिखें।';
  if(c==='auth/billing-not-enabled')return 'Firebase के मुफ़्त (Spark) प्लान पर SMS OTP चालू नहीं है। कृपया ईमेल से लॉगिन करें।';
  if(c==='auth/captcha-check-failed'||c==='auth/missing-app-credential')return 'सुरक्षा जाँच (reCAPTCHA) विफल रही। पेज रीफ़्रेश करके दोबारा कोशिश करें।';
  if(c==='auth/invalid-email')return 'ईमेल सही नहीं है।';
  if(c==='auth/popup-closed-by-user')return '';
  if(/offline|unavailable/i.test((e&&e.message)||'')||c==='unavailable')return 'Firestore तक नहीं पहुँच पा रहे। Firebase console → Firestore Database में Create database हुआ है या नहीं देखें; विज्ञापन-रोकने वाला extension बंद करके दोबारा खोलें।';
  if(c==='permission-denied'||c==='firestore/permission-denied')return 'अनुमति नहीं है। आपका ईमेल पंजीकृत नहीं है या Firestore नियम लागू नहीं हुए।';
  return (e&&e.message)||'कुछ गलत हुआ।';}
function mountLogin(box,title,hint,opts){
  opts=opts||{};
  const ph=opts.phone?`<form id="pf"><input id="pnum" type="tel" inputmode="numeric" maxlength="16" placeholder="10 अंकों का मोबाइल नंबर" autocomplete="tel-national" aria-label="मोबाइल नंबर"><button class="b p" id="psend" type="submit">OTP भेजें</button></form><form id="of" hidden><input id="pcode" type="text" inputmode="numeric" maxlength="6" placeholder="6 अंकों का OTP" autocomplete="one-time-code" aria-label="OTP"><button class="b p" id="pok" type="submit">OTP जाँचें और लॉगिन करें</button></form><div id="rc"></div><div class="lor">या ईमेल से</div>`:'';
  box.innerHTML=`<div class="lcard"><h2>${title}</h2><p class="lp">${hint}</p>${ph}<form id="lf"><input id="lemail" type="email" required placeholder="आपका ईमेल" autocomplete="email" aria-label="ईमेल"><button class="b p" id="lsend" type="submit">लॉगिन लिंक भेजें</button></form><div class="lor">या</div><button class="b" id="lgoogle" type="button">Google से लॉगिन</button><p id="lmsg" class="lmsg" aria-live="polite"></p></div>`;
  const $=s=>box.querySelector(s),msg=t=>{$('#lmsg').textContent=t};let confirm=false;
  if(!/^https?:$/.test(location.protocol)){msg('यह पेज सीधे फ़ाइल से खुला है, इसलिए लॉगिन नहीं चलेगा। इसे GitHub Pages के https:// लिंक से खोलें।');$('#lsend').disabled=true;$('#lgoogle').disabled=true;return}
  const done=async em=>{try{await auth.signInWithEmailLink(em,location.href);history.replaceState(null,'',location.pathname)}catch(e){msg(errText(e))}};
  if(opts.phone){let conf=null;
    $('#pf').onsubmit=async e=>{e.preventDefault();const n=$('#pnum').value.replace(/\D/g,'').slice(-10);if(n.length!==10){msg('10 अंकों का मोबाइल नंबर लिखें।');return}
      $('#psend').disabled=true;msg('OTP भेज रहे हैं…');
      try{$('#rc').innerHTML='';const v=new firebase.auth.RecaptchaVerifier($('#rc'),{size:'invisible'});conf=await auth.signInWithPhoneNumber('+91'+n,v);
        $('#of').hidden=false;$('#pcode').focus();msg('+91 '+n+' पर OTP भेज दिया है।')}
      catch(err){msg(errText(err))}finally{$('#psend').disabled=false}};
    $('#of').onsubmit=async e=>{e.preventDefault();if(!conf)return;$('#pok').disabled=true;
      try{await conf.confirm($('#pcode').value.trim())}catch(err){msg(errText(err))}finally{$('#pok').disabled=false}};}
  $('#lf').onsubmit=async e=>{e.preventDefault();const em=$('#lemail').value.trim().toLowerCase();
    if(confirm)return done(em);
    try{$('#lsend').disabled=true;await auth.sendSignInLinkToEmail(em,{url:location.origin+location.pathname,handleCodeInApp:true});store.set('cs_email',em);msg('लिंक '+em+' पर भेज दिया है। ईमेल (स्पैम फ़ोल्डर भी) देखें और लिंक खोलें।')}catch(err){msg(errText(err))}finally{$('#lsend').disabled=false}};
  $('#lgoogle').onclick=()=>auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e=>msg(errText(e)));
  if(auth.isSignInWithEmailLink(location.href)){const em=store.get('cs_email');
    if(em){msg('लॉगिन हो रहा है…');done(em)}else{confirm=true;$('#lsend').textContent='लॉगिन पूरा करें';msg('सुरक्षा के लिए वही ईमेल दोबारा लिखें जिस पर लिंक आया था।')}}}

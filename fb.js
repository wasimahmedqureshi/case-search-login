/* Firebase setup + email-link / Google login panel (shared by index.html and admin.html) */
const FB_CONFIG={apiKey:"AIzaSyD9VnIRajIj7cJhD-sPBeyT8CYimE_vF7k",authDomain:"rccms-5614b.firebaseapp.com",projectId:"rccms-5614b",storageBucket:"rccms-5614b.firebasestorage.app",messagingSenderId:"1076214105677",appId:"1:1076214105677:web:4a9ef42556d42eeb203e04"};
firebase.initializeApp(FB_CONFIG);
const auth=firebase.auth(),db=firebase.firestore();
const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
function errText(e){const c=e&&e.code||'';
  if(c==='auth/unauthorized-continue-uri'||c==='auth/unauthorized-domain')return 'यह वेबसाइट Firebase में अधिकृत नहीं है। Authentication → Settings → Authorized domains में इस साइट का डोमेन जोड़ें।';
  if(c==='auth/operation-not-allowed')return 'Firebase में यह लॉगिन तरीका चालू नहीं है (Authentication → Sign-in method)।';
  if(c==='auth/quota-exceeded'||c==='auth/too-many-requests')return 'अभी लॉगिन लिमिट पूरी है। कुछ देर बाद या "Google से लॉगिन" से कोशिश करें।';
  if(c==='auth/invalid-email')return 'ईमेल सही नहीं है।';
  if(c==='auth/popup-closed-by-user')return '';
  if(c==='permission-denied'||c==='firestore/permission-denied')return 'अनुमति नहीं है। आपका ईमेल पंजीकृत नहीं है या Firestore नियम लागू नहीं हुए।';
  return (e&&e.message)||'कुछ गलत हुआ।';}
function mountLogin(box,title,hint){
  box.innerHTML=`<div class="lcard"><h2>${title}</h2><p class="lp">${hint}</p><form id="lf"><input id="lemail" type="email" required placeholder="आपका ईमेल" autocomplete="email" aria-label="ईमेल"><button class="b p" id="lsend" type="submit">लॉगिन लिंक भेजें</button></form><div class="lor">या</div><button class="b" id="lgoogle" type="button">Google से लॉगिन</button><p id="lmsg" class="lmsg" aria-live="polite"></p></div>`;
  const $=s=>box.querySelector(s),msg=t=>{$('#lmsg').textContent=t};let confirm=false;
  if(!/^https?:$/.test(location.protocol)){msg('यह पेज सीधे फ़ाइल से खुला है, इसलिए लॉगिन नहीं चलेगा। इसे GitHub Pages के https:// लिंक से खोलें।');$('#lsend').disabled=true;$('#lgoogle').disabled=true;return}
  const done=async em=>{try{await auth.signInWithEmailLink(em,location.href);history.replaceState(null,'',location.pathname)}catch(e){msg(errText(e))}};
  $('#lf').onsubmit=async e=>{e.preventDefault();const em=$('#lemail').value.trim().toLowerCase();
    if(confirm)return done(em);
    try{$('#lsend').disabled=true;await auth.sendSignInLinkToEmail(em,{url:location.origin+location.pathname,handleCodeInApp:true});store.set('cs_email',em);msg('लिंक '+em+' पर भेज दिया है। ईमेल (स्पैम फ़ोल्डर भी) देखें और लिंक खोलें।')}catch(err){msg(errText(err))}finally{$('#lsend').disabled=false}};
  $('#lgoogle').onclick=()=>auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e=>msg(errText(e)));
  if(auth.isSignInWithEmailLink(location.href)){const em=store.get('cs_email');
    if(em){msg('लॉगिन हो रहा है…');done(em)}else{confirm=true;$('#lsend').textContent='लॉगिन पूरा करें';msg('सुरक्षा के लिए वही ईमेल दोबारा लिखें जिस पर लिंक आया था।')}}}

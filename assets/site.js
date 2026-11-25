/* jackbarry.ie: menu and quote page. No cookies, no tracking, nothing is sent anywhere
   except by the visitor pressing Send in their own email app. */
(function(){
  var btn = document.getElementById('menubtn'), nav = document.getElementById('nav');
  if(btn && nav){
    btn.addEventListener('click', function(){
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  var form = document.getElementById('qform');
  if(!form) return;

  var TO = 'info@jackbarry.ie';
  var QTYPES = {
    purchase:{label:'Buying', fields:[
      {id:'q-address',label:'Property address or area',type:'text'},
      {id:'q-price',label:'Purchase price',type:'text',ph:'e.g. €320,000'},
      {id:'q-prop',label:'House or apartment?',type:'seg',opts:['House','Apartment']},
      {id:'q-kind',label:'Second-hand or new build?',type:'seg',opts:['Second-hand','New build']},
      {id:'q-fund',label:'How are you buying?',type:'seg',opts:['With a Mortgage','Cash']},
      {id:'q-fhs',label:'Using the First Home Scheme?',type:'seg',opts:['No','Yes']}]},
    sale:{label:'Selling', fields:[
      {id:'q-address',label:'Property address',type:'text'},
      {id:'q-price',label:'Sale price or asking price',type:'text',ph:'e.g. €320,000'},
      {id:'q-prop',label:'House or apartment?',type:'seg',opts:['House','Apartment']},
      {id:'q-mortgage',label:'Is there a Mortgage on the property?',type:'seg',opts:['Yes','No']},
      {id:'q-agreed',label:'Is the sale agreed yet?',type:'seg',opts:['Yes','Not yet']}]},
    'switch':{label:'Switching Mortgage', fields:[
      {id:'q-address',label:'Property address',type:'text'},
      {id:'q-lender',label:'New lender',type:'text'},
      {id:'q-loan',label:'New loan amount',type:'text',ph:'e.g. €200,000'}]},
    'self-build':{label:'Self-Build Mortgage', fields:[
      {id:'q-address',label:'Site address',type:'text'},
      {id:'q-site',label:'The site',type:'seg',opts:['Already in my name','Being transferred to me']},
      {id:'q-lender',label:'Lender',type:'text'},
      {id:'q-loan',label:'Loan amount',type:'text',ph:'e.g. €250,000'}]},
    other:{label:'Something else', fields:[
      {id:'q-detail',label:'Tell us briefly what you need',type:'area'}]}
  };
  var DEFAULTS = {'q-mortgage':'Yes','q-prop':'House','q-kind':'Second-hand','q-fund':'With a Mortgage','q-fhs':'No','q-site':'Already in my name'};
  var LABELS = {};
  Object.keys(QTYPES).forEach(function(k){ QTYPES[k].fields.forEach(function(f){ LABELS[f.id] = LABELS[f.id] || f.label; }); });

  var params = new URLSearchParams(location.search), first = params.get('type');
  var state = {type: QTYPES[first] ? first : 'purchase', vals: {}};
  Object.keys(DEFAULTS).forEach(function(k){ state.vals[k] = DEFAULTS[k]; });

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  /* Government charges. Rates confirmed 11 Nov 2026; re-check after each Budget.
     Stamp duty 1% to 1m, 2% on the next 500k, 6% above 1.5m. Land Registry transfer fee by price band;
     175 to register a Mortgage. */
  function parseMoney(s){
    s = String(s||'').toLowerCase().replace(/[€,\s]/g,'');
    var m = s.match(/^(\d+(?:\.\d+)?)(k|m)?/); if(!m) return 0;
    var n = parseFloat(m[1]); if(m[2]==='k') n*=1e3; if(m[2]==='m') n*=1e6;
    return Math.round(n);
  }
  function stampDuty(p){
    var d = Math.min(p,1e6)*0.01;
    if(p>1e6) d += (Math.min(p,1.5e6)-1e6)*0.02;
    if(p>1.5e6) d += (p-1.5e6)*0.06;
    return Math.round(d);
  }
  function regFee(p){ return p<=50000?400:p<=200000?600:p<=400000?700:800; }
  function money(n){ return '€'+n.toLocaleString('en-IE',{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2}); }

  /* Jack's fees, fee schedule agreed 12 Nov 2026 (plus VAT at 23%, VAT also on sundries).
     The fee is the fixed fee or 0.5% of the price, whichever is greater (changed 25 Nov 2026, no
     500,000 step); a sale with a Mortgage to repay is +200; over 1m quoted individually. */
  function estimate(type, v){
    var fee, sund, extra = [], totalLabel = 'Estimated total', p = 0, mort, note = '';
    if(type==='purchase' || type==='sale'){
      p = parseMoney(v['q-price']);
      if(p<1000) return {msg:'Enter the price to see your estimate.'};
      if(p>1e6) return {msg:'For a price over €1 million, Jack quotes individually. Send your details and he will reply within one working day.'};
    }
    if(type==='purchase'){
      mort = v['q-fund']!=='Cash';
      fee = mort ? 2300 : 1950; sund = mort ? 100 : 75;
      if(mort && v['q-fhs']==='Yes') fee += 250;
      if(v['q-kind']==='New build') fee += 200;
      if(v['q-prop']==='Apartment') fee += 200;
      if(v['q-kind']==='New build'){
        var rate = v['q-prop']==='Apartment' ? 0.09 : 0.135;
        extra.push(['Stamp duty, on the price before VAT', stampDuty(p/(1+rate))]);
        note = ' The price you entered is taken to include VAT at '+(Math.round(rate*1000)/10)+'%.';
      } else extra.push(['Stamp duty', stampDuty(p)]);
      extra.push(['Land Registry fees', regFee(p) + (mort ? 175 : 0)]);
    } else if(type==='sale'){
      fee = 1950; sund = 75;
      if(v['q-prop']==='Apartment') fee += 200;
      if(v['q-mortgage']==='Yes') fee += 200;
    } else if(type==='switch'){
      fee = 1250; sund = 50;
      extra.push(['Land Registry fee for the new Mortgage', 175]);
    } else if(type==='self-build'){
      fee = v['q-site']==='Being transferred to me' ? 2800 : 2300; sund = 100;
      extra.push(['Each stage payment', '€100 plus VAT']);
      extra.push(['Land Registry fee for the Mortgage', 175]);
      totalLabel = 'Total before stage payments';
    } else return null;
    fee = Math.max(fee, Math.round(p*0.005));
    var vat = Math.round((fee+sund)*23)/100;
    var rows = [['Legal fee',fee],['Sundries',sund],['VAT at 23%',vat]].concat(extra), total = 0;
    rows.forEach(function(r){ if(typeof r[1]==='number') total += r[1]; });
    return {rows:rows, total:total, totalLabel:totalLabel, note:note};
  }
  function estimateHtml(e){
    if(!e) return '';
    if(e.msg) return '<p class="small">'+e.msg+'</p>';
    return '<ul class="sums">'+e.rows.map(function(r){
        return '<li><span>'+r[0]+'</span>'+(typeof r[1]==='number' ? '<span class="amt">'+money(r[1])+'</span>' : '<span class="amt txt">'+r[1]+'</span>')+'</li>';
      }).join('')
      + '<li class="total"><span>'+e.totalLabel+'</span><span class="amt">'+money(e.total)+'</span></li></ul>'
      + '<p class="small">An estimate for a standard file. Jack confirms it in writing once he has seen the details. Searches and any other costs are set out in that quote.'+e.note+'</p>';
  }

  function fieldHtml(f){
    var v = state.vals[f.id] || '';
    if(f.type==='seg') return '<fieldset class="field"><legend class="lbl">'+f.label+'</legend><div class="seg">'
      + f.opts.map(function(o,i){ return '<label class="opt"><input type="radio" name="'+f.id+'" id="'+f.id+'-'+i+'" value="'+esc(o)+'"'+(v===o?' checked':'')+'><span>'+esc(o)+'</span></label>'; }).join('')+'</div></fieldset>';
    if(f.type==='area') return '<div class="field"><label for="'+f.id+'">'+f.label+'</label><textarea id="'+f.id+'" name="'+f.id+'">'+esc(v)+'</textarea></div>';
    return '<div class="field"><label for="'+f.id+'">'+f.label+'</label><input type="text" id="'+f.id+'" name="'+f.id+'" value="'+esc(v)+'"'+(f.ph?' placeholder="'+esc(f.ph)+'"':'')+(f.id==='q-price'||f.id==='q-loan'?' inputmode="decimal"':'')+'></div>';
  }
  function drawFields(){
    document.getElementById('qfields').innerHTML = QTYPES[state.type].fields.map(fieldHtml).join('');
    refreshCharges();
  }
  function refreshCharges(){
    var box = document.getElementById('qcharges');
    if(state.type==='other'){ box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = '<h3>Your estimate</h3>' + estimateHtml(estimate(state.type, state.vals));
  }

  function buildMessage(){
    var v = state.vals, T = QTYPES[state.type], lines = [];
    lines.push('Quote request from jackbarry.ie', '', 'Type: '+T.label);
    T.fields.forEach(function(f){
      var val = (v[f.id]||'').trim();
      if(val) lines.push(f.label.replace(/\?$/,'')+': '+val);
    });
    lines.push('', 'Name: '+(v['q-name']||'').trim());
    if((v['q-phone']||'').trim()) lines.push('Phone: '+v['q-phone'].trim());
    if((v['q-email']||'').trim()) lines.push('Email: '+v['q-email'].trim());
    var e = state.type==='other' ? null : estimate(state.type, v);
    if(e && e.rows){
      lines.push('', 'Estimate shown on the website (plus VAT as shown):');
      e.rows.forEach(function(r){ lines.push('  '+r[0]+': '+(typeof r[1]==='number' ? money(r[1]) : r[1])); });
      lines.push('  '+e.totalLabel+': '+money(e.total));
    }
    return lines.join('\n');
  }
  function mailtoHref(msg){
    var subject = 'Quote request: '+QTYPES[state.type].label+(((state.vals['q-name']||'').trim()) ? ' ('+state.vals['q-name'].trim()+')' : '');
    return 'mailto:'+TO+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(msg);
  }

  var sent = document.getElementById('qsent'), err = document.getElementById('qerr');

  document.querySelectorAll('input[name="qtype"]').forEach(function(r){ r.checked = (r.value===state.type); });
  form.addEventListener('input', function(e){
    var t = e.target;
    if(t.name==='qtype'){ state.type = t.value; drawFields(); return; }
    if(t.type==='radio'){ state.vals[t.name] = t.value; }
    else if(t.id){ state.vals[t.id] = t.value; }
    refreshCharges();
  });
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var v = state.vals, msg = '';
    if(!(v['q-name']||'').trim()) msg = 'Please give your name so we know who to reply to.';
    else if(!(v['q-phone']||'').trim() && !(v['q-email']||'').trim()) msg = 'Please give a phone number or an email address so we can reply.';
    else if((v['q-email']||'').trim() && !/^\S+@\S+\.\S+$/.test(v['q-email'].trim())) msg = 'That email address does not look right. Please check it.';
    if(msg){ err.textContent = msg; err.hidden = false; return; }
    err.hidden = true;
    var text = buildMessage(), href = mailtoHref(text);
    document.getElementById('qopen').setAttribute('href', href);
    document.getElementById('qtext').value = text;
    form.hidden = true; sent.hidden = false;
    window.scrollTo(0, 0);
    document.getElementById('qsent-h').focus();
    window.location.href = href;
  });
  document.getElementById('qback').addEventListener('click', function(){
    sent.hidden = true; form.hidden = false; window.scrollTo(0, 0);
  });
  document.getElementById('qcopy').addEventListener('click', function(){
    var ta = document.getElementById('qtext'), note = document.getElementById('qcopied');
    function done(ok){ note.textContent = ok ? 'Copied. Paste it into an email to '+TO+'.' : 'Select the text above and copy it, then email it to '+TO+'.'; }
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(ta.value).then(function(){ done(true); }, function(){ ta.select(); done(false); }); }
      else { ta.select(); done(document.execCommand && document.execCommand('copy')); }
    }catch(x){ ta.select(); done(false); }
  });

  drawFields();
})();

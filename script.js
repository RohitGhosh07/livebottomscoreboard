(function(){
  const API_BASE = "https://sports.forcempower.com/CSC2025/show_result_details_matchwise.php?match_id=";
  const qs = new URLSearchParams(location.search);
  const MATCH_ID = qs.get("match_id") || "2506";

  const els = {
    name1: document.getElementById('name1'),
    name2: document.getElementById('name2'),
    logo1: document.getElementById('logo1'),
    logo2: document.getElementById('logo2'),
    sets1: document.getElementById('sets1'),
    sets2: document.getElementById('sets2'),
    tag: document.getElementById('tag'),
    row1: document.getElementById('row1'),
    row2: document.getElementById('row2')
  };

  let lastSig = "";

  const safe = (v, fb="") => (v===null || v===undefined) ? fb : String(v).trim() || fb;

  async function load(){
    try{
      const res = await fetch(API_BASE + encodeURIComponent(MATCH_ID), { cache:'no-store' });
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      if(data.process_sts !== "YES") throw new Error(data.process_msg || 'API error');

      const groups = data.schedule_and_results_details || {};
      const match = Object.values(groups).flat().find(m => m.id == MATCH_ID);
      if(!match) throw new Error('Match not found in response');

      // ---- names (exactly as API sends) ----
      const t1 = safe(match.team1, "TEAM 1");
      const t2 = safe(match.team2, "TEAM 2");
      els.name1.textContent = t1;   // no uppercase conversion
      els.name2.textContent = t2;

      // ---- logos (square, left of name) ----
      const defaultLogo = "https://sports.forcempower.com/CSC2025/team_image/default.png";
      const logo1Url = safe(match.team1_image_url, defaultLogo) || defaultLogo;
      const logo2Url = safe(match.team2_image_url, defaultLogo) || defaultLogo;
      els.logo1.src = logo1Url;
      els.logo2.src = logo2Url;
      els.logo1.alt = t1;
      els.logo2.alt = t2;

      // tag
      const sport = safe(match.sports_name, "DARTS").toUpperCase();
      const grp = match.group ? ` • ${match.group}` : "";
      els.tag.textContent = `${sport}${grp}`;

      // legs/games -> sets
      const games = match.result_data || {};
      const maxLegs = 5;
      const orderedKeys = Object.keys(games)
        .sort((a,b) => (parseInt(a.replace(/\D+/g,''))||0)-(parseInt(b.replace(/\D+/g,''))||0))
        .slice(0, maxLegs);

      const legs = [];
      for(let i=0;i<maxLegs;i++){
        const key = orderedKeys[i];
        if(!key){ legs.push({ t1:"–", t2:"–", winner:0 }); continue; }
        const g = games[key] || {};
        const s1 = parseInt(g.team_1_score || "0",10);
        const s2 = parseInt(g.team_2_score || "0",10);
        let winner = 0;
        if(Number.isFinite(s1) && Number.isFinite(s2)){
          if(s1 > s2) winner = 1;
          else if(s2 > s1) winner = 2;
        }
        legs.push({ t1: Number.isFinite(s1)?s1:"–", t2: Number.isFinite(s2)?s2:"–", winner });
      }

      const sig = [t1,t2,logo1Url,logo2Url,...legs.map(l=>`${l.t1}-${l.t2}-${l.winner}`)].join('|');
      const changed = sig !== lastSig;
      lastSig = sig;

      renderSets(els.sets1, legs, 1, changed);
      renderSets(els.sets2, legs, 2, changed);

      if(changed){
        els.row1.classList.remove('flash'); els.row2.classList.remove('flash');
        void els.row1.offsetWidth; // reflow
        els.row1.classList.add('flash'); els.row2.classList.add('flash');
      }

    }catch(e){
      console.error(e);
      els.tag.textContent = 'NO DATA';
    }
  }

  function renderSets(container, legs, teamRow /*1|2*/, animate){
    container.innerHTML = "";
    legs.forEach(l=>{
      const el = document.createElement('span');
      el.className = 'set';
      if((teamRow===1 && l.winner===1) || (teamRow===2 && l.winner===2)) el.classList.add('win');
      el.textContent = teamRow===1 ? l.t1 : l.t2;
      if(animate){ el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'), 550); }
      container.appendChild(el);
    });
  }

  load();
  setInterval(load, 10000);
})();
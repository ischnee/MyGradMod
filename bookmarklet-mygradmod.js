javascript:(function(){
    /* MyGradMod: run on MyGrad > Students > Student Lists > By Quarter (any quarter).
       Joins the By Quarter rosters for the current and next quarters (every student, with status) to MyGrad's student detail records
       (milestones, committees, funding) by SystemKey, and opens a dashboard tab. Only roster students
       (plus any current student missing from the roster) and only the fields in KEEP reach the
       dashboard; former students appear only in class totals and, on hover, as a name and outcome
       for their class's hollow dots. Nothing is stored or sent anywhere. Definitions and design decisions are kept
       in the maintainer's notes file (bookmarklet-mygradmod-notes.md, not published). */
    /* MyGradMod's own message box, shown inside the MyGrad page: lower down than a browser alert, and headed so a
       first-time user knows the bookmarklet itself is installed and working. OK, Enter, Escape or a click outside closes it. */
    function notice(msg){
        var old = document.getElementById("mygradmod-notice");
        if(old) old.remove();
        var shade = document.createElement("div");
        shade.id = "mygradmod-notice";
        shade.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(30,16,60,.28);display:flex;justify-content:center;align-items:flex-start;padding-top:32vh";
        shade.innerHTML = "<div role='alertdialog' aria-labelledby='mygradmod-notice-head' style='width:min(440px,calc(100vw - 40px));background:#fff;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden;font:15px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#222'>"
            + "<div id='mygradmod-notice-head' style='background:#4b2e83;color:#fff;font-size:12px;font-weight:600;letter-spacing:.04em;padding:8px 16px'>MyGradMod successfully installed</div>"
            + "<div class='msg' style='padding:16px 18px 4px'></div>"
            + "<div style='padding:10px 18px 16px;text-align:right'><button type='button' style='background:#4b2e83;color:#fff;border:0;border-radius:16px;padding:6px 20px;font:inherit;font-weight:600;cursor:pointer'>OK</button></div></div>";
        shade.querySelector(".msg").textContent = msg;
        var onKey = function(e){ if(e.key === "Escape" || e.key === "Enter"){ e.preventDefault(); close(); } };
        var close = function(){ shade.remove(); document.removeEventListener("keydown", onKey, true); };
        shade.addEventListener("click", function(e){ if(e.target === shade || e.target.tagName === "BUTTON") close(); });
        document.addEventListener("keydown", onKey, true);
        document.body.appendChild(shade);
        shade.querySelector("button").focus();
    }
    if(location.pathname.indexOf("/mgp-dept.stu.detail/home/studentlistnew") === -1){
        notice("Open MyGrad > Students > Student Lists > By Quarter, then click this bookmarklet again.");
        return;
    }
    /* Students come from MyGrad's By Quarter lists for the current quarter and the next one, whatever quarter the page
       shows. MyGrad gives one quarter's list at a time, and neither list alone has everyone: the next quarter's lacks
       students finishing now, and the current one lacks some who are only on the next (it was the only list used for a
       day in Sept 2026, and people went missing). Together they cover everyone in the program now.
       MyGrad numbers quarters 1 Winter, 2 Spring, 3 Summer, 4 Autumn, with the calendar year (from the page's own
       requests, Sept 2026). The current quarter: Autumn from September, Winter January to March, Spring April to August
       (graduate students aren't expected to register for summer). The next: Autumn → Winter, Winter → Spring, Spring →
       Summer. status=0 and degree=0 are the page's own "all statuses" and "all degrees". */
    var QNAME = { 1: "Winter", 2: "Spring", 3: "Summer", 4: "Autumn" };
    var today = new Date(), month = today.getMonth(), thisYear = today.getFullYear();
    var thisQ = month >= 8 ? { code: 4, year: thisYear } : month <= 2 ? { code: 1, year: thisYear } : { code: 2, year: thisYear };
    var nextQ = thisQ.code === 4 ? { code: 1, year: thisYear + 1 } : { code: thisQ.code + 1, year: thisYear };
    function listUrl(code, year){ return location.origin + "/mgp-dept.stu.detail/home/getStudentListNew?quarter=" + code + "&year=" + year + "&status=0&degree=0"; }
    [thisQ, nextQ].forEach(function(q){
        q.label = QNAME[q.code] + " " + q.year;
        q.url = listUrl(q.code, q.year);
    });
    var listsLabel = thisQ.label + " and " + nextQ.label;
    var w = window.open("", "_blank");
    if(!w){
        notice("Pop-up blocked! Allow pop-ups for this site, then click again.");
        return;
    }
    w.document.write("<title>MyGradMod</title><p style='font-family:sans-serif;padding:20px;color:#4b2e83'>Loading student data from MyGrad...</p>");
    w.document.close();

    /* Links to each student's MyGrad record, read from the By Quarter table and keyed by Student ID. The table shows the
       page's quarter, so linkMaker (below) builds links for students missing from it. */
    var links = {};
    document.querySelectorAll("table").forEach(function(table){
        var heads = Array.prototype.map.call(table.querySelectorAll("th"), function(th){ return th.textContent.trim().toLowerCase(); });
        var idCol = heads.indexOf("student id");
        if(idCol === -1) return;
        table.querySelectorAll("tbody tr").forEach(function(tr){
            var cells = tr.querySelectorAll("td");
            var a = tr.querySelector("a[href]");
            if(cells[idCol] && a) links[cells[idCol].textContent.trim()] = a.href;
        });
    });

    var KEEP = ["StudentName", "StudentPreferredName", "DegLevel", "DegreeCode", "DegreeTitle", "Status", "Class", "NewContReturn", "GradAdmitYr", "GradAdmitQtr",
        "LastYrEnrolled", "LastQtrEnrolled", "NextYrReg", "NextQtrReg", "LeaveEndsYr", "LeaveEndsQtr",
        "HasPhC", "HasAdvisor", "AdvisorChair", "HasMastersComm", "HasDocComm", "HasReadingComm",
        "MastersRequests", "GenExamRequests", "FinalExamRequests", "HasTA", "HasFellow", "ClearedToTeach", "ITASpeak", "UWDegrees", "GPA"];

    function getJson(url, body){
        var opts = { credentials: "include", headers: { "Accept": "application/json, text/plain, */*" } };
        if(body){
            opts.method = "POST";
            opts.headers["Content-Type"] = "application/json;charset=UTF-8";
            opts.body = JSON.stringify(body);
        }
        return fetch(url, opts).then(function(r){
            if(!r.ok) throw new Error("HTTP " + r.status);
            return r.json();
        });
    }
    /* Builds a record link for a roster student missing from the page's table, on the pattern of the table's own links:
       each contains the student's SystemKey (or Student ID) exactly once. The pattern is used only if every link on the
       page that can be matched to the roster follows it; otherwise those students simply have no link. */
    function linkMaker(roster){
        var pairs = roster.filter(function(r){ return links[String(r.StudentID)]; });
        var fields = ["SystemKey", "StudentID"];
        for(var i = 0; i < fields.length && pairs.length; i++){
            var field = fields[i], shape = null, ok = pairs.every(function(r){
                var parts = links[String(r.StudentID)].split(String(r[field]));
                if(parts.length !== 2) return false;
                if(shape === null) shape = parts;
                return parts[0] === shape[0] && parts[1] === shape[1];
            });
            if(ok) return function(r){ return r[field] === undefined || r[field] === null || r[field] === "" ? "" : shape[0] + r[field] + shape[1]; };
        }
        return null;
    }
    /* The full history. MyGrad's detail records miss many former students: in Sept 2026, 60 of the doctoral-track
       students on its quarter lists since 1990 had no detail record. So once the dashboard is open, every quarter's list
       is read, from next year back until five years in a row are empty (about a minute; MyGrad answers one request at a
       time). Students found only there, in the PhD (Pre-Doctor, Doctor of Philosophy) or MA program, join the entering
       class of their first quarter in it. Their last list entry gives the outcome: "Graduated" with the Doctor of
       Philosophy title is a PhD (16 of 17 PhDs with detail records ended that way, and none of 29 others); "Graduated"
       without it is an MA; anything else means they left, with an MA if any list shows them "Graduated" in the Master
       of Arts program (older records only: none of 34 recent MAs with detail records show one). Only these reach the dashboard: counts per class, and for each
       student the name, outcome, quarter and years to PhD shown on hover, as for other former students. */
    function loadListHistory(ctx){
        var QS = { 1: "Win", 2: "Spr", 3: "Sum", 4: "Aut" }, onLists = {}, year = nextQ.year, empty = 0, oldest = null;
        var tell = function(msg){ try { if(!w.closed && w.mygradmodHistory) w.mygradmodHistory(msg); } catch(e){} };
        var finish = function(){
            var extra = {}, found = 0;
            Object.keys(onLists).forEach(function(k){
                if(ctx.details[k] || ctx.current[k]) return;
                var rs = onLists[k].sort(function(a, b){ return a.idx - b.idx; });
                var inProgram = rs.filter(function(r){ return /DOCTOR OF PHILOSOPHY|PRE-DOCTOR|MASTER OF ARTS/i.test(r.title) && !/CERTIFICATE|^\s*GNM/i.test(r.title); });
                if(!inProgram.length) return;
                var first = inProgram[0], last = rs[rs.length - 1], program = inProgram[inProgram.length - 1].title.trim();
                var ay = first.code >= 3 ? first.year : first.year - 1;   /* Summer and Autumn begin that year's class */
                var h = extra[ay + "|" + program] || (extra[ay + "|" + program] = { ay: ay, program: program, entered: 0, enrolled: 0, phd: 0, maOnly: 0, left: 0, phdCand: 0, leftCand: 0,
                    formers: [], phdYears: [], listedEntered: 0, listedPhd: 0, listedMa: 0, listedLeft: 0 });
                var graduated = /graduated/i.test(last.status), phdTitle = rs.some(function(r){ return /DOCTOR OF PHILOSOPHY/i.test(r.title); });
                var when = QS[last.code] + " " + last.year;
                h.entered++; h.listedEntered++; found++;
                if(graduated && phdTitle){
                    var took = (last.idx - first.idx) / 4;
                    h.phd++; h.listedPhd++; h.phdYears.push(took);
                    h.formers.push({ name: last.name, outcome: "phd", when: when, years: took, fromLists: true });
                } else if(graduated){
                    h.maOnly++; h.listedMa++;
                    h.formers.push({ name: last.name, outcome: "ma", when: when, fromLists: true });
                } else {
                    var maRow = rs.filter(function(r){ return /graduated/i.test(r.status) && /MASTER OF ARTS/i.test(r.title); })[0];
                    if(maRow){
                        h.maOnly++; h.listedMa++;
                        h.formers.push({ name: last.name, outcome: "ma", when: QS[maRow.code] + " " + maRow.year, fromLists: true });
                    } else {
                        h.left++; h.listedLeft++;
                        h.formers.push({ name: last.name, outcome: "left", when: when, fromLists: true });
                    }
                }
            });
            tell({ cohorts: Object.keys(extra).map(function(key){ return extra[key]; }), found: found, oldest: oldest });
        };
        (function next(){
            if(w.closed) return;
            if(empty >= 5 || year < 1950) return finish();
            tell({ progress: year });
            Promise.all([1, 2, 3, 4].map(function(code){
                return getJson(listUrl(code, year)).then(rowsOf).catch(function(){ return []; }).then(function(rs){ return { code: code, rs: rs }; });
            })).then(function(lists){
                var n = 0;
                lists.forEach(function(l){
                    n += l.rs.length;
                    l.rs.forEach(function(r){
                        (onLists[r.SystemKey] = onLists[r.SystemKey] || []).push({ idx: year * 4 + l.code - 1, year: year, code: l.code,
                            title: String(r.DegreeTitle || ""), status: String(r.quarterStatus || "").trim(), name: r.LegalName || "" });
                    });
                });
                if(n){ empty = 0; oldest = year; } else empty++;
                year--;
                next();
            });
        })();
    }
    function rowsOf(d){
        if(Array.isArray(d)) return d;
        if(d && typeof d === "object") return d.Data || d.data || Object.values(d).find(Array.isArray) || [];
        return [];
    }
    var PAGE_HTML = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>MyGradMod</title><style>'
        + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:0;background:#f4f5f7;color:#222}'
        + 'header{background:#2e1a5c;color:#fff;padding:14px 25px;display:flex;flex-wrap:wrap;gap:6px 20px;align-items:baseline;position:relative}#program{margin-left:auto;align-self:center;max-width:320px;font:inherit;font-size:14px;padding:6px 9px;border:0;border-radius:6px;background:#fff;color:#2e1a5c;cursor:pointer}#program.on{background:#c3b1f0;font-weight:600;box-shadow:0 0 0 2px #efe9f9}#program:focus-visible{outline:2px solid #fff;outline-offset:2px}#settings-btn{align-self:center;width:50px;height:50px;margin-top:-6px;margin-bottom:-6px;display:flex;align-items:center;justify-content:center;background:transparent;color:#fff;border:0;border-radius:50%;padding:0;font-size:41px;line-height:1;cursor:pointer}#settings-btn:hover,#settings-btn[aria-expanded=true]{background:rgba(255,255,255,.18)}#settings-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}#settings{position:absolute;right:25px;top:100%;margin-top:6px;z-index:30;width:min(620px,calc(100vw - 50px));background:#fff;color:#222;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.2);padding:14px 18px;font-size:14px}#settings[hidden]{display:none}.set-head{display:flex;flex-direction:column;gap:2px;margin-bottom:10px}.set-head strong{color:#4b2e83;font-size:15px}.set-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 22px;margin-bottom:12px}.set-grid label{display:flex;gap:6px;align-items:center;justify-content:space-between}.set-grid input[type=number]{width:52px}'
        + 'header h1{margin:0;font-size:21px}header p{margin:0;color:#e8e3d3;font-size:14px}'
        + '.bar{background:#fff;margin:15px 25px 0;padding:10px 20px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.05);border-left:4px solid #85754d;display:flex;flex-wrap:wrap;gap:12px 22px;align-items:center;font-size:14px}'
        + '.bar strong{color:#4b2e83;text-transform:uppercase;letter-spacing:.5px}.bar label{display:flex;gap:5px;align-items:center}'
        + '.bar input[type=number]{width:52px}.bar select,.bar input[type=search]{font-size:14px;padding:3px 6px}'
        + ''
        + ''
        + ''
        + 'tr.hl td{background:#ecf3fd}tr.hl td:first-child{box-shadow:inset 4px 0 0 #2563eb}'
        + '#cohorts th,#cohorts td{text-align:center}#cohorts th:first-child,#cohorts td:first-child{text-align:left}#cohorts thead th{font-size:15px}#cohorts th.grp{border-bottom:none;color:#85754d;font-size:13px;letter-spacing:.05em;text-transform:uppercase;cursor:default;padding-bottom:5px}#cohorts th.grp.now{color:#4b2e83;border-bottom:3px solid #b9a6e0}#cohorts th.grp.gone{color:#6b7280;border-bottom:3px solid #cfd2d8}#cohorts .spc,#cohorts tbody tr td.spc,#cohorts tr.c-active td.spc,#cohorts tr:hover td.spc{min-width:24px;padding:0;border:none;background:#fff;box-shadow:none}#cohorts th.nc{min-width:40px;width:1%}#cohorts th.snug{width:1%}#cohorts th.tight,#cohorts td.flagcell,#cohorts tbody td:nth-child(8){padding-left:4px;padding-right:4px}#cohorts th.fit{width:1%;padding-right:8px}#cohorts tbody td:first-child{white-space:nowrap}#cohorts tfoot td{border-bottom:none;background:#fff;padding-top:8px}#cohorts tfoot td.sum{border-top:2px solid #b9a6e0;color:#2e1a5c}#cohorts tfoot td.sum-med{border-top:2px solid #cfd2d8;color:#2e1a5c;line-height:1.2}@media (min-width:1560px){#cohorts thead tr:not(:first-child) th:not(.spc),#cohorts tbody td:not(.spc),#cohorts tfoot td:not(.spc){padding-left:9px;padding-right:9px}#cohorts tbody td.strip-cell,#cohorts tfoot td.strip-cell{padding-right:13px}}@media (min-width:1700px){#cohorts thead tr:not(:first-child) th:not(.spc),#cohorts tbody td:not(.spc),#cohorts tfoot td:not(.spc){padding-left:13px;padding-right:13px}#cohorts tbody td.strip-cell,#cohorts tfoot td.strip-cell{padding-right:13px}}@media (min-width:1900px){#cohorts thead tr:not(:first-child) th:not(.spc),#cohorts tbody td:not(.spc),#cohorts tfoot td:not(.spc){padding-left:17px;padding-right:17px}#cohorts tbody td.strip-cell,#cohorts tfoot td.strip-cell{padding-right:17px}}#cohorts th.yrs{text-align:center;line-height:1.2;border-bottom:1px solid #cfe3d7;padding-bottom:3px}#cohorts th.yrs-sub{font-size:13px;padding:3px 4px 6px;min-width:34px;width:1%;text-align:center}'
        + '#cohorts tbody tr{cursor:pointer}#cohorts tbody tr:hover td{background:#f1f2f5}#cohorts tbody tr.c-active:hover td{background:#d7e5f9}#cohorts tr.c-active td{background:#e6effb}#cohorts tr.c-active td:first-child{box-shadow:inset 4px 0 0 #2563eb}'
        + ''
        + '.pill{border:1px solid #4b2e83;background:#fff;color:#4b2e83;border-radius:14px;padding:3px 12px;font-size:13px;font-weight:600;cursor:pointer}.pill.on{background:#4b2e83;color:#fff}'
        + ''
        + ''
        + '#cohorts .blk{border-left:2px solid #e8e3f3}#cohorts td.st-none{color:#c9c9c9}#cohorts td.st-on{color:#2e1a5c;font-weight:600}#cohorts tbody tr td.st-on.c-late,#cohorts tbody tr td.c-late[style]{color:#6b2f05}#cohorts td{vertical-align:middle}#cohorts td.summary{white-space:nowrap}#cohorts td.sc{cursor:pointer}#cohorts td.sc.sel{box-shadow:inset 0 0 0 2.5px #1d4ed8}#cohorts td.strip-cell{text-align:left;white-space:nowrap;padding-right:13px;width:1%}.stripwrap{display:flex;align-items:center;gap:6px}.striptext{display:inline-flex;align-items:center;gap:4px}.stnum{min-width:18px;text-align:right;font-variant-numeric:tabular-nums}.stof{min-width:27px;line-height:1.15}.strip{display:flex;flex-wrap:wrap;gap:7px 12px;flex:none;width:max-content;max-width:150px}@media (min-width:1720px){.strip{max-width:312px}}.dgrp{display:flex;gap:5px}.sdot{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;cursor:pointer;color:#fff;font-size:11px;font-weight:700;font-style:normal;letter-spacing:-.2px;line-height:1;flex:none}.sdot.gone{background:#fff;box-shadow:inset 0 0 0 1.5px #b9b0cf;cursor:default}.sdot.ring{box-shadow:0 0 0 2px #fff,0 0 0 4px #1d4ed8}.conn{display:inline-flex;align-items:center;gap:3px;padding:3px 5px;border-radius:4px;cursor:pointer;white-space:nowrap}.conn b{display:block;width:15px;height:15px;border-radius:3px;box-shadow:inset 0 0 0 1px #cbbfe6}.conn .cn{margin-left:7px;font-size:13px;color:#555}.conn.lit{box-shadow:0 0 0 2px #1d4ed8;background:#fff}tr.hl.soft td{background:#f5f9fe}tr.hl.soft td:first-child{box-shadow:inset 4px 0 0 #bcd3f5}tr.focus td{background:#d3e3f8}#cohorts td.flagcell{cursor:pointer;font-weight:600;color:#92400e}#cohorts td.flagcell.sel{box-shadow:inset 0 0 0 2.5px #1d4ed8}#cohorts td.oc{font-weight:600}#cohorts td.phdpair,#cohorts th.phdpair{background:#f1f8f4}#cohorts th.oh{white-space:nowrap;line-height:1.2;vertical-align:bottom;padding-left:6px;padding-right:6px}#cohorts th.fit{line-height:1.2}.ohd{display:inline-grid;grid-auto-flow:column;align-items:center;column-gap:6px;text-align:left}#cohorts thead tr:last-child th{vertical-align:bottom}.sdot.gone{cursor:default}#tip{position:fixed;z-index:20;pointer-events:none;display:none;max-width:300px;background:#2e1a5c;color:#fff;font-size:13px;line-height:1.45;padding:8px 11px;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.25)}#tip .th{font-weight:600;margin-bottom:3px}#tip .tn{color:#e8e3d3}#tip ul{margin:4px 0 0;padding-left:16px}#tip .tf{margin-top:5px;color:#cbbfe6;font-size:12px}tr.focus td:first-child{box-shadow:inset 5px 0 0 #1d4ed8}'
        + '.c-ok{color:#047857;font-weight:600}#cohorts tbody tr td.c-late{background:#fef3c7;color:#92400e;font-weight:600}'
        + '.panel{background:#fff;margin:15px 25px;padding:15px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.05);overflow-x:auto}'
        + '.panel h2{margin:0 0 10px;color:#4b2e83;font-size:20px;border-bottom:2px solid #b7a57a;padding-bottom:6px}.panel h2.dark-head{display:flex;align-items:center;gap:10px;margin:-15px -15px 14px;padding:10px 20px 8px;min-height:44px;background:#2e1a5c;color:#fff;border-bottom:none;border-radius:6px 6px 0 0}.panel.collapsed h2.dark-head{margin-bottom:-15px;padding-bottom:10px;border-radius:6px}.panel.collapsed .dark-head .seg,.panel.collapsed .dark-head select,.panel.collapsed .dark-head input,.panel.collapsed .dark-head .bar-opt{display:none}.classes-head #cohort-note,.classes-head #hist-status{color:#cbbfe6}.classes-head #hist-status{white-space:nowrap;cursor:help}.classes-head .panel-toggle{white-space:nowrap}.panel.collapsed #class-slider,.panel.collapsed #cohort-note,.panel.collapsed #hist-status{display:none}#class-slider{position:relative;flex:1;height:46px;margin:0 44px;cursor:pointer;touch-action:none;-webkit-user-select:none;user-select:none;font-weight:normal}.sl-seg{position:absolute;top:15px;height:4px;background:#8a72d6}.sl-seg.hist{background:#56565d}.sl-seg.hist.gap{background:repeating-linear-gradient(90deg,#56565d 0 4px,transparent 4px 8px)}.sl-seg.sel{top:13px;height:8px;background:#cdb8fa;cursor:grab}.sl-seg.sel.hist{background:#9d9da5}.sl-seg.sel.hist.gap{background:repeating-linear-gradient(90deg,#9d9da5 0 5px,transparent 5px 8px)}.sl-dot{position:absolute;top:17px;width:22px;height:22px;margin:-11px 0 0 -11px;padding:0;border-radius:50%;background:#efe9f9;border:3px solid #2e1a5c;box-shadow:0 0 0 2px #b9abd8,0 1px 5px rgba(0,0,0,.45);cursor:ew-resize}.sl-dot:focus-visible{outline:none;box-shadow:0 0 0 2px #b9abd8,0 0 0 6px rgba(255,255,255,.35)}.sl-lab{position:absolute;top:30px;transform:translateX(-50%);font-size:13px;font-weight:600;color:#efe9f9;white-space:nowrap;pointer-events:none}.sl-lab.sl-end{color:rgba(255,255,255,.5);font-weight:normal}.set-line{display:flex;gap:6px;align-items:center}.set-note{margin:4px 0 12px 22px}.dark-head .seg{display:inline-flex;margin-left:14px;border:1px solid #8f7bc4;border-radius:15px;overflow:hidden;font-weight:normal}.seg button{background:none;border:0;color:#e6ddf7;font:inherit;font-size:14px;padding:4px 13px;cursor:pointer}.seg button+button{border-left:1px solid #8f7bc4}.seg button b{color:#fff;margin-left:2px}.seg button:hover{background:rgba(255,255,255,.08)}.seg button.on{background:#c3b1f0;color:#2e1a5c}.seg button.on b{color:#2e1a5c}.bar-fill{flex:1}.dark-head select,.dark-head input[type=search]{font-size:14px;padding:4px 7px;border:0;border-radius:5px;font-weight:normal}.dark-head input[type=search]{width:210px}.bar-opt{display:inline-flex;align-items:center;gap:5px;font-size:14px;font-weight:normal;color:#e6ddf7;cursor:pointer;margin-left:4px}.hl-line:empty{display:none}.hl-line{margin:-4px 0 8px}.summary{display:grid;grid-template-columns:1.45fr .8fr 1fr 1.75fr;row-gap:14px;background:#fff;margin:15px 25px 0;padding:14px 0;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.05)}.summary section{padding:0 22px;border-left:2px solid #e8e3f3}.summary section:first-child{border-left:none}@media (max-width:1000px){.summary{grid-template-columns:1fr}.summary section{border-left:none}}.summary h4{margin:0 0 4px;color:#85754d;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}.sm-big{display:flex;align-items:center;gap:12px;font-size:29px;font-weight:700;color:#4b2e83;line-height:1.2;margin-bottom:4px}.sm-parts{display:flex;flex-wrap:wrap;gap:2px 4px;font-size:14px;color:#444}.sm-note{font-size:13px;color:#666}.sm-win{background:none;border:0;padding:0;font:inherit;color:inherit;letter-spacing:inherit;text-transform:inherit;cursor:pointer;text-decoration:underline dotted}.sm-win:hover{color:#4b2e83}.sm-of{font-size:13px;font-weight:normal;color:#666;line-height:1.25;margin-left:4px}.sm-bigs{display:flex;gap:48px;flex-wrap:wrap;margin-bottom:6px}.sm-lines{display:flex;flex-direction:column;gap:3px;font-size:13px;color:#444}.sm-lines b{color:#2e1a5c}.sm-out .small{font-size:12px}.sm-foot{margin-top:3px;font-size:12px;color:#666}#cohorts tr.rates td{border-bottom:none;padding-top:0;font-size:13px;color:#666}#cohorts td.rate-l{text-align:left}#cohorts tr.star td{border:none;background:#fff;padding-top:6px;text-align:right;font-size:13px;color:#666;white-space:nowrap}.outcomes:empty{display:none}.outcomes{margin:12px 0 0;font-size:14px;color:#333;line-height:1.7}.outcomes strong{color:#2e1a5c}.outcomes .sep{color:#bbb;margin:0 8px}.outcomes b{color:#2e1a5c}.sm-sep{width:1px;align-self:stretch;background:#ddd;margin:3px 10px 3px 4px}.sm-others{margin-top:4px;align-items:center;font-size:13px}.sm-others .sm-note{margin-right:6px}.sm-n{background:none;border:0;border-radius:4px;padding:2px 6px;margin-left:-6px;font:inherit;color:inherit;cursor:pointer}.sm-n b{color:#2e1a5c}.sm-n:hover{background:#f3eefc}.sm-n.on{background:#dbe8fb;box-shadow:inset 0 0 0 1.5px #2563eb}.sm-n.big{font-size:29px;font-weight:700;padding:0 6px}.sm-n.big b{color:#4b2e83}.sm-n.late b{color:#92400e}#roster td.coh{position:relative;vertical-align:top;background:#fff;box-shadow:none;padding:0 10px 0 22px;cursor:pointer;width:1%;min-width:96px;border-bottom:1px solid #e2dcef}.coh-bar{position:absolute;left:8px;top:7px;bottom:7px;width:4px;border-radius:2px;background:#c9bdea}#roster td.coh:hover .coh-bar{background:#9f8bd6}#roster td.coh.c-active .coh-bar{background:#2563eb;width:6px;left:7px}#roster td.coh.other{cursor:default}#roster td.coh.other .coh-bar{background:#d4d4d8}.coh-label{position:sticky;top:8px;display:flex;flex-direction:column;padding:8px 0;line-height:1.35;max-width:120px}.coh-label b{color:#2e1a5c;font-size:15px}.coh-label span{font-size:13px;color:#666}.coh-label em{font-style:normal;color:#92400e;font-weight:600}#roster td.coh.c-active .coh-label b{color:#1d4ed8}#roster.by-cohort tr.hl td.nm{box-shadow:inset 4px 0 0 #2563eb}#roster.by-cohort tr.hl.soft td.nm{box-shadow:inset 4px 0 0 #bcd3f5}#roster.by-cohort tr.focus td.nm{box-shadow:inset 5px 0 0 #1d4ed8}'
        + '.panel-toggle{background:none;border:none;padding:0;margin:0 4px 0 0;font:inherit;color:inherit;cursor:pointer}.panel-toggle .chev{display:inline-block;width:18px;font-size:13px;transition:transform .15s}'
        + '.panel.collapsed .panel-body{display:none}.panel.collapsed h2{margin-bottom:0;border-bottom:none;padding-bottom:0}.panel.collapsed .panel-toggle .chev{transform:rotate(-90deg)}'
        + 'table{border-collapse:collapse;width:100%;font-size:14px}th{text-align:left;color:#4b2e83;border-bottom:2px solid #ddd;padding:6px 8px;cursor:pointer;white-space:nowrap}'
        + 'td{border-bottom:1px solid #eee;padding:6px 8px;vertical-align:top}tr.limited td{color:#666}a{color:#4b2e83;font-weight:600}'
        + '.chip{display:inline-block;border-radius:10px;padding:1px 8px;margin:1px 3px 1px 0;font-size:12px;font-weight:600;white-space:nowrap}'
        + '.yes{background:#d1fae5;color:#047857}.no{background:#f3f4f6;color:#6b7280}.red{background:#fee2e2;color:#b91c1c}.amber{background:#fef3c7;color:#92400e}.info{background:#e0e7ff;color:#3730a3}.gray{background:#f3f4f6;color:#4b5563}'
        + '.small{font-size:12px;color:#666}'
        + 'footer{margin:0 25px 25px;font-size:13px;color:#666}.hist-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:14px;width:max-content;max-width:calc(100vw - 40px);box-sizing:border-box;background:#2e1a5c;color:#fff;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.3);padding:11px 10px 11px 18px;font-size:14px;transition:opacity .4s}.hist-toast b{color:#cbbfe6;font-weight:600}.hist-toast button{background:none;border:0;color:#cbbfe6;font-size:20px;line-height:1;cursor:pointer;padding:0 6px;border-radius:4px}.hist-toast button:hover{background:rgba(255,255,255,.12)}.hist-toast.gone{opacity:0}'
        + '</style></head><body>';

    /* getStudentList takes a status code per group, -1 leaving the group out. CURRENT is what the Current
       list page sends; OTHERS asks for the two groups it leaves out (codes 4 and 5: last quarter and
       inactive, which also holds former students). Those only fill in details for roster students. */
    var detailUrl = location.origin + "/mgp-dept.stu.detail/home/getStudentList";
    var CURRENT = { cs_preregistered: 3, cs_enrolled: 1, cs_onleave: 2, cs_lastquarter: -1, cs_inactive: -1, cs_afterqtrstart: 6, cs_beforeqtrstart: 7,
        ncr_continuing: 0, ncr_new: 1, ncr_returning: 2, ncr_new_continuing: 3, ncr_new_returning: 4 };
    var OTHERS = Object.assign({}, CURRENT, { cs_preregistered: -1, cs_enrolled: -1, cs_onleave: -1, cs_afterqtrstart: -1, cs_beforeqtrstart: -1, cs_lastquarter: 4, cs_inactive: 5 });

    Promise.all([
        getJson(thisQ.url),
        getJson(detailUrl, CURRENT).catch(function(){ return null; }),
        getJson(detailUrl, OTHERS).catch(function(){ return null; }),
        getJson(nextQ.url).catch(function(){ return null; })
    ]).then(function(res){
        /* The current quarter's row wins for a student on both lists; a student only on the next quarter's list keeps its row. */
        var roster = rowsOf(res[0]), onThisList = {};
        roster.forEach(function(r){ onThisList[r.SystemKey] = true; });
        (res[3] === null ? [] : rowsOf(res[3])).forEach(function(r){ if(!onThisList[r.SystemKey]){ r.nextOnly = true; roster.push(r); } });
        var current = res[1] === null ? null : rowsOf(res[1]);
        var detailByKey = {}, currentKeys = {};
        /* The current list's record wins: a current student can also have an older, inactive record (e.g. an earlier program)
           in the other groups, which must not replace their current details. */
        (res[2] === null ? [] : rowsOf(res[2])).concat(current || []).forEach(function(d){
            var o = {};
            KEEP.forEach(function(k){ o[k] = d[k] === null || d[k] === undefined ? "" : String(d[k]); });
            detailByKey[d.SystemKey] = o;
        });
        (current || []).forEach(function(d){ currentKeys[d.SystemKey] = true; });
        /* Students go by their preferred name where MyGrad has one. Names read "Last, First"; a preferred name may come the same
           way, as a first name alone, or as "First Last", so it is read loosely. The legal name is kept (when different) for search. */
        function displayName(legal, preferred){
            var p = String(preferred || "").trim(), l = String(legal || "").trim(), last = l.split(",")[0].trim(), words = p.split(/\s+/);
            if(!p) return l;
            if(p.indexOf(",") !== -1) return p;
            if(words.length === 1) return last ? last + ", " + p : p;
            if(last && p.toLowerCase().slice(-last.length) === last.toLowerCase()) return last + ", " + p.slice(0, -last.length).trim();
            return words.pop() + ", " + words.join(" ");
        }
        function named(o, legal, d){ o.name = displayName(legal, d && d.StudentPreferredName); if(o.name !== legal) o.legalName = legal; return o; }
        var seen = {}, makeLink = linkMaker(roster);
        var students = roster.map(function(r){
            seen[r.SystemKey] = true;
            var d = detailByKey[r.SystemKey] || null;
            return named({ onRoster: true, link: links[String(r.StudentID)] || (makeLink ? makeLink(r) : ""), overall: r.StudentStatusDesc || "", quarter: (r.quarterStatus || "") + (r.nextOnly ? " (" + nextQ.label + ")" : ""),
                degreeTitle: r.DegreeTitle || "", degreeCode: r.DegreeCode || "", credits: r.credits, d: d }, r.LegalName || (d ? d.StudentName : ""), d);
        });
        Object.keys(currentKeys).forEach(function(k){
            if(seen[k]) return;
            var d = detailByKey[k];
            students.push(named({ link: makeLink ? makeLink({ SystemKey: k }) : "", overall: d.Status, quarter: "Not on MyGrad's " + listsLabel + " lists", degreeTitle: d.DegreeTitle, degreeCode: d.DegreeCode, credits: "", d: d }, d.StudentName, d));
        });
        /* Entering-class history: every Philosophy degree student MyGrad returns, current and former, reduced
           to per-class totals (one set per program) here so no former student's record reaches the dashboard. Certificate and
           non-matriculated students are left out. Classes start in autumn; summer admits join that autumn.
           A student's program is their latest record's degree title, as in Students (the level stands in if there is none). */
        var QN = { WIN: 0, SPR: 1, SUM: 2, AUT: 3 };
        var history = {}, rosterTitle = {};
        roster.forEach(function(r){ rosterTitle[r.SystemKey] = r.DegreeTitle || ""; });
        Object.keys(detailByKey).forEach(function(k){
            var d = detailByKey[k];
            var yr = parseInt(d.GradAdmitYr, 10);
            if(!yr || QN[d.GradAdmitQtr] === undefined || /-ETHICS-/.test(d.DegreeCode) || /certificate/i.test(d.DegreeTitle) || d.Class === "GNM") return;
            var ay = d.GradAdmitQtr === "AUT" || d.GradAdmitQtr === "SUM" ? yr : yr - 1;
            var program = d.DegreeTitle || rosterTitle[k] || (/doct|ph\.?\s?d/i.test(d.DegLevel) ? "Doctoral" : /mast/i.test(d.DegLevel) ? "Master's" : d.DegLevel || "Other");
            var h = history[ay + "|" + program] || (history[ay + "|" + program] = { ay: ay, program: program, entered: 0, enrolled: 0, phd: 0, maOnly: 0, left: 0, phdCand: 0, leftCand: 0, years: [], formers: [] });
            /* Degree evidence: MyGrad's request fields miss older degrees, so also read "UW degrees", e.g.
               "Spring, 2024 - MASTER OF ARTS (PHILOSOPHY)". Only Philosophy degrees count. */
            var uwPhd = String(d.UWDegrees).match(/(win|spr|sum|aut)\w*,?\s+(\d{4})\s*-\s*DOCTOR OF PHILOSOPHY \(PHILOSOPHY\)/i);
            var uwMA = String(d.UWDegrees).match(/(win|spr|sum|aut)\w*,?\s+(\d{4})\s*-\s*MASTER OF ARTS \(PHILOSOPHY\)/i);
            var award = String(d.FinalExamRequests).split(/<br\s*\/?>/i).map(function(l){ return l.replace(/<[^>]*>/g, "").trim(); }).filter(function(l){ return /awarded/i.test(l); })[0]
                || (uwPhd ? uwPhd[1] + " " + uwPhd[2] + " - PhD (UW degree record)" : undefined);
            var maLine = String(d.MastersRequests).split(/<br\s*\/?>/i).filter(function(l){ return /granted|awarded/i.test(l); })[0]
                || (uwMA ? uwMA[1] + " " + uwMA[2] + " - MA (UW degree record)" : undefined);
            var isCurrent = seen[k] || currentKeys[k], everEnrolled = d.LastYrEnrolled !== "" && d.LastYrEnrolled !== "0";
            if(!award && !isCurrent && !everEnrolled) return; /* admitted but never enrolled (e.g. declined): not part of the class; see notes */
            h.entered++;
            var when = function(line){ var q = String(line || "").match(/^(win|spr|sum|aut)\w*,?\s+(\d{4})/i); return q ? q[1].charAt(0).toUpperCase() + q[1].slice(1, 3).toLowerCase() + " " + q[2] : ""; };
            var cand = /^(y|yes|true)$/i.test(String(d.HasPhC).trim());
            if(award){
                h.phd++;
                if(cand) h.phdCand++;
                var m = award.match(/^(win|spr|sum|aut)\w*\s+(\d{4})/i);
                var took = m ? ((parseInt(m[2], 10) * 4 + QN[m[1].toUpperCase()]) - (yr * 4 + QN[d.GradAdmitQtr])) / 4 : null;
                if(took !== null) h.years.push(took);
                h.formers.push({ name: displayName(d.StudentName, d.StudentPreferredName), outcome: "phd", when: when(award), years: took });
            } else if(isCurrent) h.enrolled++;
            else if(maLine){
                h.maOnly++;
                if(cand) h.leftCand++;
                h.formers.push({ name: displayName(d.StudentName, d.StudentPreferredName), outcome: "ma", when: when(maLine) });
            } else {
                h.left++;
                if(cand) h.leftCand++;
                h.formers.push({ name: displayName(d.StudentName, d.StudentPreferredName), outcome: "left", when: d.LastYrEnrolled && d.LastYrEnrolled !== "0" ? ((d.LastQtrEnrolled || "") + " " + d.LastYrEnrolled).trim() : "" });
            }
        });
        var cohorts = Object.keys(history).map(function(key){
            var h = history[key];
            return { ay: h.ay, program: h.program, entered: h.entered, enrolled: h.enrolled, phd: h.phd, maOnly: h.maOnly, left: h.left, formers: h.formers, phdYears: h.years, phdCand: h.phdCand, leftCand: h.leftCand };
        });
        var payload = { students: students, cohorts: cohorts, detailLoaded: current !== null, rosterQuarter: listsLabel, generated: new Date().toISOString() };
        var json = JSON.stringify(payload).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
        w.document.open();
        w.document.write(PAGE_HTML + "<script>(" + dashboard.toString() + ")(" + json + ");<\/script></body></html>");
        w.document.close();
        loadListHistory({ details: detailByKey, current: Object.assign({}, seen, currentKeys) });
    }).catch(function(err){
        w.document.body.innerHTML = "<p style='font-family:sans-serif;padding:20px;color:#b91c1c'>Couldn't load the student list from MyGrad (" + err.message + "). Reload the By Quarter page and try again.</p>";
    });

    function dashboard(data){
        /* Defaults follow the UW Philosophy Graduate Handbook timeline (2026-27): MA by year 2, committee and chair in year 3,
           general exam and reading committee in year 4, five-year funding package; 10- and 6-year limits are Grad School policy. */
        var defaults = { maBy: 2, advisorBy: 3, docCommBy: 3, phcBy: 4, readingBy: 4, fundingYears: 5, docWarn: 9, mastersWarn: 5, gpaOn: false, gpaMin: 3.0, allYears: false, formerInitials: false };
        var settings = Object.assign({}, defaults);
        try { Object.assign(settings, JSON.parse(localStorage.getItem("grad-monitor-settings") || "{}")); } catch(e){}
        var view = { show: "inprogram", program: "all", search: "", sort: "flags", dir: -1, highlight: null, range: null };
        try { view.range = JSON.parse(localStorage.getItem("grad-monitor-classes-shown") || "null"); } catch(e){}
        view.groupByClass = true;
        try { view.groupByClass = localStorage.getItem("grad-monitor-group-by-class") !== "0"; } catch(e){}
        /* The program picked in the page header applies to the whole page: summary, Entering classes and Students.
           Programs match by degree title, ignoring case and spacing. */
        function normTitle(p){ return String(p || "").trim().replace(/\s+/g, " ").toLowerCase(); }
        /* Pre-Doctor is the PhD program's earlier stage, so it counts as the PhD program (the Doctor of Philosophy title found
           in the data); a student's own record still shows their title. Worked out on first use, once titles are set. */
        var phdTitle;
        function phdProgram(){
            if(phdTitle === undefined) phdTitle = data.students.map(function(s){ return s.program; }).concat(data.cohorts.map(function(c){ return c.program; }))
                .filter(function(p){ return /^\s*doctor of philosophy/i.test(p || ""); })[0] || null;
            return phdTitle;
        }
        function progKey(p){ var k = normTitle(p); return /^pre-?\s?doctor/.test(k) && phdProgram() ? normTitle(phdProgram()) : k; }
        function inProgram(p){ return view.program === "all" || progKey(p) === view.program; }
        /* Current students only. Students who have finished (PhD awarded) can linger on the By Quarter list; like every other
           PhD they appear in the Entering classes history (a green hollow dot), not in the student tables. */
        function roster(){ return data.students.filter(function(s){ return !s.done && inProgram(s.program); }); }
        /* Entering-class history for the program picked: MyGrad's totals come per class and program, combined here per class. */
        var mergedFor = null, merged = [];
        function cohorts(){
            if(mergedFor === view.program) return merged;
            var byAY = {}, order = { left: 0, ma: 1, phd: 2 };
            data.cohorts.filter(function(c){ return inProgram(c.program); }).forEach(function(c){
                var m = byAY[c.ay] || (byAY[c.ay] = { ay: c.ay, entered: 0, enrolled: 0, phd: 0, maOnly: 0, left: 0, phdCand: 0, leftCand: 0, listedEntered: 0, listedPhd: 0, listedMa: 0, listedLeft: 0, formers: [], phdYears: [] });
                ["entered", "enrolled", "phd", "maOnly", "left", "phdCand", "leftCand", "listedEntered", "listedPhd", "listedMa", "listedLeft"].forEach(function(k){ m[k] += c[k] || 0; });
                m.formers = m.formers.concat(c.formers || []);
                m.phdYears = m.phdYears.concat(c.phdYears || []);
            });
            merged = Object.keys(byAY).map(function(ay){
                var m = byAY[ay];
                m.formers.sort(function(a, b){ return order[a.outcome] - order[b.outcome] || String(a.name).localeCompare(String(b.name)); });
                m.phdYears.sort(function(a, b){ return a - b; });
                return m;
            });
            mergedFor = view.program;
            return merged;
        }

        function esc(s){ return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
        function lines(v){ return String(v || "").split(/<br\s*\/?>/i).map(function(x){ return x.replace(/<[^>]*>/g, "").trim(); }).filter(Boolean); }
        function chip(cls, text, title){ return "<span class='chip " + cls + "'" + (title ? " title='" + esc(title) + "'" : "") + ">" + esc(text) + "</span>"; }

        /* Academic years start in autumn; summer admits join the autumn cohort that follows. */
        var now = new Date(data.generated);
        var currentAY = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
        function admitAY(qtr, yr){ var y = parseInt(yr, 10); if(!y) return null; return qtr === "AUT" || qtr === "SUM" ? y : y - 1; }

        /* The Philosophy MA / PhD: a granted request in MyGrad, or the degree in MyGrad's "UW degrees" list. Other degrees don't count. */
        function philMA(d){ return /granted|awarded/i.test(d.MastersRequests) || /MASTER OF ARTS \(PHILOSOPHY\)/i.test(d.UWDegrees); }
        /* MyGrad's yes/no fields: "Yes", "Y" or "true" in any case. */
        function yes(v){ return /^(y|yes|true)$/i.test(String(v || "").trim()); }
        /* An advisor counts if MyGrad lists one, even when its HasAdvisor field says otherwise (it can lag behind the advisor list). */
        function hasAdvisor(d){ return yes(d.HasAdvisor) || lines(d.AdvisorChair).some(function(l){ return /[a-z]/i.test(l) && !/^(none|tbd|n\/?a)$/i.test(l.trim()); }); }
        function philPhD(d){ return /awarded/i.test(d.FinalExamRequests) || /DOCTOR OF PHILOSOPHY \(PHILOSOPHY\)/i.test(d.UWDegrees); }
        data.students.forEach(function(s, i){
            s.idx = i;
            var d = s.d;
            var title = (d && d.DegreeTitle) || s.degreeTitle;
            /* MyGrad's degree level isn't always spelled "Doctoral" / "Master's", so read it loosely and fall back to the degree title. */
            var raw = (d && d.DegLevel) || "";
            s.level = d && d.Class === "GNM" ? "Non-matriculated" : /-ETHICS-/.test(s.degreeCode) || /certificate/i.test(s.degreeTitle + " " + title) ? "Certificate"
                : /doct|ph\.?\s?d/i.test(raw) ? "Doctoral" : /mast/i.test(raw) ? "Master's"
                : /doctor|ph\.?\s?d/i.test(title) ? "Doctoral" : /master|\bm\.?a\b/i.test(title) ? "Master's" : raw || "Other";
            s.program = title || s.level;
            var ay = d ? admitAY(d.GradAdmitQtr, d.GradAdmitYr) : null;
            s.year = ay === null ? null : currentAY - ay + 1;
            s.cohort = ay;
            s.nonDegree = s.level === "Certificate" || s.level === "Non-matriculated";
            s.done = !!d && philPhD(d);
        });

        function flagsFor(s){
            var f = [], d = s.d, y = s.year;
            if(/inactive/i.test(s.overall)) f.push(["red", "Inactive status"]);
            if(!d || s.done || !y || s.nonDegree) return f;
            if(!hasAdvisor(d) && y > settings.advisorBy) f.push(["amber", "No advisor"]);
            /* The three stall flags are exactly the stage stalls in Entering classes: one flag, where the student is stuck. */
            var stage = stageOf(s);
            if(stage === 0 && y > settings.maBy) f.push(["amber", "Still in MA phase"]);
            if(stage === 1 && y > settings.docCommBy) f.push(["amber", "No doctoral committee"]);
            if(stage === 2 && y > settings.phcBy) f.push(["amber", "Not yet a candidate"]);
            if(stage === 3 && !yes(d.HasReadingComm) && y > settings.readingBy) f.push(["amber", "No reading committee"]);
            if(s.level === "Doctoral" && y >= settings.docWarn) f.push(["red", "Year " + y + " of 10-year limit"]);
            if(s.level === "Master's" && y >= settings.mastersWarn) f.push(["red", "Year " + y + " of 6-year limit"]);
            if(settings.gpaOn && d.GPA !== "" && Number(d.GPA) < settings.gpaMin) f.push(["amber", "GPA below " + settings.gpaMin]);
            return f;
        }

        function milestones(s){
            var d = s.d;
            if(!d) return "<span class='small'>No MyGrad details found</span>";
            if(s.level === "Certificate") return "<span class='small'>Certificate student: degree milestones are tracked by their home program</span>";
            if(s.level === "Non-matriculated") return "<span class='small'>Non-matriculated student: no degree milestones</span>";
            var yn =function(v, label){ return chip(yes(v) ? "yes" : "no", (yes(v) ? "✓ " : "✗ ") + label); };
            var out = yn(hasAdvisor(d) ? "Yes" : "No", "Advisor") + yn(philMA(d) ? "Yes" : "No", "MA");
            if(s.level === "Doctoral") out += yn(d.HasDocComm, "Doc. committee") + yn(d.HasPhC, "Candidacy") + yn(d.HasReadingComm, "Reading committee");
            else out += yn(d.HasMastersComm, "Master's committee");
            var req = [["Master's", d.MastersRequests], ["General exam", d.GenExamRequests], ["Final exam", d.FinalExamRequests]];
            req.forEach(function(r){ lines(r[1]).forEach(function(l){ out += "<div class='small'>" + esc(r[0] + ": " + l) + "</div>"; }); });
            return out;
        }

        function notes(s){
            var d = s.d, out = "";
            if(s.done) out += chip("yes", s.level === "Doctoral" ? "PhD awarded" : "Degree granted");
            if(d && d.LeaveEndsQtr) out += chip("info", "On leave until " + d.LeaveEndsQtr + " " + d.LeaveEndsYr);
            if(!d) out += chip("gray", "Limited info");
            return out;
        }

        /* International TA speaking requirement: only a value that explicitly says it is not yet met counts against a student
           ("Not satisfied", "Not met", "Failed", "Pending", "Incomplete"). "Required" alone isn't enough: it can sit
           on older records of students who have since met it. Met, satisfied, exempt, not required, blank or anything else is fine. */
        function speakingMet(d){ return !/\bnot\s+(yet\s+)?(satisf|met|pass|complet)|unsatisf|fail|pending|incomplete/i.test(d.ITASpeak || ""); }
        function funding(s){
            var d = s.d;
            if(!d) return "";
            var out = (d.HasTA ? chip("info", "TA") : "") + (d.HasFellow ? chip("info", "Fellowship") : "");
            if(!speakingMet(d)) out += chip("red", "Speaking req. not met", "International TA speaking requirement (MyGrad: " + d.ITASpeak + ")");
            if(!s.done && !s.nonDegree && s.year > settings.fundingYears) out += chip("gray", "Past " + settings.fundingYears + "-year funding", "Beyond the guaranteed funding package unless quarters were deferred");
            return out || "<span class='small'>None listed</span>";
        }

        /* Stage flow for enrolled PhD-track students: 0 pre-MA, 1 MA done, 2 doctoral committee, 3 candidate.
           null = outside the flow (no MyGrad details, finished, certificate, or no admission date). Used by the stage
           cells, the dot strips and the connector cells so they always agree. */
        var STAGE_SHORT = ["pre-MA", "MA done", "committee", "candidate"];
        var STAGE_LONG = ["pre-MA", "MA done, no doctoral committee yet", "doctoral committee, not yet a candidate", "candidate"];
        function stageOf(s){
            if(!s.d || s.done || s.nonDegree || s.cohort === null) return null;
            /* New students are admitted under the PhD degree code, so the code says nothing about the MA:
               "MA done" needs the Philosophy MA itself (philMA). */
            return yes(s.d.HasPhC) ? 3 : yes(s.d.HasDocComm) ? 2 : philMA(s.d) ? 1 : 0;
        }
        function moveOnBy(i){ return [settings.maBy, settings.docCommBy, settings.phcBy, null][i]; }
        function isStalled(s){ var i = stageOf(s); return i !== null && moveOnBy(i) !== null && s.year > moveOnBy(i); }
        var STALLED_DOT = "rgba(217,119,6,0.85)", ON_DOT = "rgba(75,46,131,0.72)";
        var OUTCOME = { left: { ring: "#b4b8bf", text: "#6b7280", label: "left, no degree" }, ma: { ring: "#c49a2c", text: "#8a6512", label: "left with MA" }, phd: { ring: "#047857", text: "#047857", label: "PhD awarded" } };

        /* A student's place in the stage flow: four small boxes mirroring the stage cells, theirs filled. */
        function connector(s, lit){
            var i = stageOf(s);
            if(i === null) return "<span class='small' title='" + esc(!s.d ? "No MyGrad details" : s.done ? "Degree finished" : s.level === "Non-matriculated" ? "Non-matriculated student" : s.level === "Certificate" ? "Certificate student: milestones tracked by their home program" : "No admission date in MyGrad") + "'>—</span>";
            var st = isStalled(s);
            var boxes = [0, 1, 2, 3].map(function(k){ return "<b" + (k === i ? " style='background:" + (st ? STALLED_DOT : ON_DOT) + ";box-shadow:none'" : "") + "></b>"; }).join("");
            return "<span class='conn" + (lit ? " lit" : "") + "' data-student='" + s.idx + "' role='button' tabindex='0' title='Click to single out this student in Entering classes'>" + boxes
                + "<span class='cn'>" + STAGE_SHORT[i] + (st ? " · stalled" : "") + "</span></span>";
        }

        var sorters = {
            stage: function(s){ var i = stageOf(s); return i === null ? -1 : i; },
            name: function(s){ return s.name.toLowerCase(); },
            program: function(s){ return s.level + s.program; },
            year: function(s){ return s.year === null ? -1 : s.year; },
            status: function(s){ return s.overall + s.quarter; },
            flags: function(s){ var f = flagsFor(s); return f.filter(function(x){ return x[0] === "red"; }).length * 10 + f.length; }
        };

        function visible(){
            var q = view.search.toLowerCase();
            return roster().filter(function(s){
                if(view.show === "inprogram" && stageOf(s) === null) return false;
                if(view.show === "flagged" && flagsFor(s).length === 0) return false;
                if(view.show === "limited" && s.d) return false;
                if(q && (s.name + " " + (s.legalName || "") + " " + (s.d ? lines(s.d.AdvisorChair).join(" ") : "")).toLowerCase().indexOf(q) === -1) return false;
                return true;
            }).sort(function(a, b){
                var x = sorters[view.sort](a), y = sorters[view.sort](b);
                return (x < y ? -1 : x > y ? 1 : 0) * view.dir || a.name.localeCompare(b.name);
            });
        }

        /* The summary's numbers; clicking one highlights its students below (click again to clear). */
        var groups = {
            inprogram: ["In the program (PhD and MA)", function(s){ return stageOf(s) !== null; }],
            certificate: ["Certificate", function(s){ return s.level === "Certificate"; }],
            nonmatric: ["Non-matriculated", function(s){ return s.level === "Non-matriculated"; }],
            nodetails: ["No MyGrad details", function(s){ return !s.d && !s.nonDegree; }],
            noadmit: ["No admission date", function(s){ return !!s.d && !s.nonDegree && s.cohort === null; }],
            onschedule: ["On schedule", function(s){ return stageOf(s) !== null && !isStalled(s); }],
            stalled: ["Stalled", function(s){ return isStalled(s); }],
            flagged: ["Flagged", function(s){ return flagsFor(s).length > 0; }],
            funded: ["Funded now (TA or fellowship)", function(s){ return !!s.d && !!(s.d.HasTA || s.d.HasFellow); }],
            available: ["Available to TA", function(s){ return !!s.d && yes(s.d.ClearedToTeach) && speakingMet(s.d) && !s.d.HasTA && !s.d.HasFellow; }],
            limited: ["Limited info", function(s){ return !s.d; }]
        };

        function initials(name){ var p = String(name).split(","), last = p[0].trim(), first = (p[1] || "").trim(); return (first.charAt(0) + last.charAt(0)).toUpperCase(); }
        function mean(xs){ return xs.length ? xs.reduce(function(a, b){ return a + b; }, 0) / xs.length : null; }
        function median(xs){ var ys = xs.slice().sort(function(a, b){ return a - b; }), n = ys.length; return n ? (n % 2 ? ys[(n - 1) / 2] : (ys[n / 2 - 1] + ys[n / 2]) / 2) : null; }
        function classLabel(ay){ return ay + "–" + String(ay + 1).slice(2); }
        function focusClass(key){
            if(!key) return null;
            if(key.indexOf("cohort:") === 0) return parseInt(key.slice(7), 10);
            if(key.indexOf("stage:") === 0 || key.indexOf("flagged:") === 0) return parseInt(key.split(":")[1], 10);
            if(key.indexOf("student:") === 0) return data.students[parseInt(key.slice(8), 10)].cohort;
            return null;
        }
        /* Degree levels in the summary: "level:<slug>" highlights the program's students at that level. */
        var LEVEL_SHORT = { "Doctoral": "PhD", "Master's": "MA" };
        function levelSlug(level){ return String(level).replace(/[^a-z]/gi, ""); }
        function levelOf(key){ var slug = key.slice(6), s = data.students.filter(function(x){ return levelSlug(x.level) === slug; })[0]; return s ? s.level : slug; }
        function highlighter(key){
            if(!key) return null;
            if(key.indexOf("level:") === 0){ var slug = key.slice(6); return function(s){ return stageOf(s) !== null && levelSlug(s.level) === slug; }; }
            var ay = focusClass(key);
            /* A class means its degree students, as in Entering classes (certificate and non-matriculated students aren't counted there). */
            if(ay !== null || /^(cohort|stage|student|flagged):/.test(key)) return function(s){ return s.cohort === ay && ay !== null && !s.nonDegree; };
            return groups[key][1];
        }
        /* The students singled out within the highlighted class (a stage cell's students, or one student). */
        function focuser(key){
            if(!key) return null;
            if(key.indexOf("stage:") === 0){ var p = key.split(":"), ay = parseInt(p[1], 10), i = parseInt(p[2], 10); return function(s){ return s.cohort === ay && stageOf(s) === i; }; }
            if(key.indexOf("student:") === 0){ var idx = parseInt(key.slice(8), 10); return function(s){ return s.idx === idx; }; }
            if(key.indexOf("flagged:") === 0){ var fay = parseInt(key.slice(8), 10); return function(s){ return s.cohort === fay && !s.nonDegree && flagsFor(s).length > 0; }; }
            return null;
        }
        function highlightLabel(key){
            if(key.indexOf("stage:") === 0){ var p = key.split(":"); return "entering class " + classLabel(parseInt(p[1], 10)) + " · " + STAGE_SHORT[parseInt(p[2], 10)]; }
            if(key.indexOf("flagged:") === 0) return "entering class " + classLabel(parseInt(key.slice(8), 10)) + " · flagged";
            if(key.indexOf("student:") === 0){ var s = data.students[parseInt(key.slice(8), 10)]; return s.name + (s.cohort !== null ? " (entering class " + classLabel(s.cohort) + ")" : ""); }
            if(key.indexOf("level:") === 0){ var lv = levelOf(key); return (LEVEL_SHORT[lv] || lv) + " students"; }
            return key.indexOf("cohort:") === 0 ? "entering class " + classLabel(parseInt(key.slice(7), 10)) : groups[key][0];
        }

        /* One row per entering class: progress of students enrolled now (against the flag thresholds) and history totals. */
        /* Which classes the table shows: a slider from the current year (left) back to the oldest class on record (right).
           Its stops are the class years; years with no entering class are skipped unless Settings asks for every year.
           The purple stretch runs back to the oldest class with current students, which is also the default selection. */
        /* Recomputed when the history from MyGrad's quarter lists arrives (mygradmodHistory, below). */
        var classYears, newestAY, oldestAY, candidacyKnown;
        function historyDerived(){
            classYears = data.cohorts.map(function(c){ return c.ay; });
            newestAY = Math.max.apply(null, classYears.concat([currentAY]));
            oldestAY = Math.min.apply(null, classYears.concat([currentAY]));
            /* Candidacy for former students is trusted only if MyGrad records it for nearly every PhD with a detail record (every PhD reached it). */
            var phd = 0, cand = 0;
            data.cohorts.forEach(function(c){ phd += c.phd - (c.listedPhd || 0); cand += c.phdCand || 0; });
            candidacyKnown = phd > 0 && cand / phd >= 0.9;
        }
        historyDerived();
        var currentClasses = roster().filter(function(s){ return stageOf(s) !== null; }).map(function(s){ return s.cohort; });
        var oldestCurrentAY = currentClasses.length ? Math.min.apply(null, currentClasses) : newestAY;
        function sliderStops(){
            var stops = [];
            for(var y = newestAY; y >= oldestAY; y--) if(settings.allYears || y === newestAY || classYears.indexOf(y) !== -1) stops.push(y);
            return stops;
        }
        function skippedYears(){
            var out = [], stops = classYears.concat([newestAY]).filter(function(y, i, a){ return a.indexOf(y) === i; }).sort(function(a, b){ return b - a; });
            for(var i = 0; i + 1 < stops.length; i++) if(stops[i] - stops[i + 1] > 1) out.push(stops[i + 1] + 1 === stops[i] - 1 ? String(stops[i] - 1) : (stops[i + 1] + 1) + "–" + (stops[i] - 1));
            return out;
        }
        function defaultRange(){ return { from: oldestCurrentAY, to: newestAY }; }
        function rangeBounds(){
            var r = view.range && typeof view.range.from === "number" && typeof view.range.to === "number" ? view.range : defaultRange();
            var clamp = function(y){ return Math.max(oldestAY, Math.min(newestAY, y)); };
            return [clamp(Math.min(r.from, r.to)), clamp(Math.max(r.from, r.to))];
        }
        function setRange(r){ view.range = r; try { localStorage.setItem("grad-monitor-classes-shown", JSON.stringify(r)); } catch(e){} renderCohorts(); }
        function nearestStop(stops, year){ var best = 0; stops.forEach(function(y, i){ if(Math.abs(y - year) < Math.abs(stops[best] - year)) best = i; }); return best; }
        /* The selection as stop indexes: a = the newer end (left), b = the older end (right). */
        function sliderSel(){ var stops = sliderStops(), r = rangeBounds(); return { stops: stops, a: nearestStop(stops, r[1]), b: nearestStop(stops, r[0]) }; }
        function drawSlider(){
            var el = document.getElementById("class-slider"), sel = sliderSel(), stops = sel.stops, last = stops.length - 1, W = el.offsetWidth || 600;
            var pos = function(i){ return last ? i / last * 100 : 0; };
            var out = "", hasCurrent = {};
            roster().forEach(function(s){ if(stageOf(s) !== null) hasCurrent[s.cohort] = true; });
            /* Each cohort owns the track around its stop: lavender if it has current students, gray if not. A run of skipped years
               (no entering class) is a dashed gray piece in the middle of the gap. The thick selected part runs exactly dot to dot. */
            var piece = function(from, to, cls, title){ return to > from ? "<i class='sl-seg" + cls + "' style='left:" + from + "%;width:calc(" + (to - from) + "% + 1px)'" + (title ? " title='" + title + "'" : "") + "></i>" : ""; };
            for(var i = 0; i <= last; i++){
                var p = pos(i), gapL = i > 0 && stops[i - 1] - stops[i] > 1, gapR = i < last && stops[i] - stops[i + 1] > 1;
                var L = i === 0 ? 0 : gapL ? pos(i - 1) + (p - pos(i - 1)) * 2 / 3 : (pos(i - 1) + p) / 2;
                var R = i === last ? 100 : gapR ? p + (pos(i + 1) - p) / 3 : (p + pos(i + 1)) / 2;
                var cls = hasCurrent[stops[i]] ? "" : " hist";
                out += piece(L, p, cls + (i > sel.a && i <= sel.b ? " sel" : "")) + piece(p, R, cls + (i >= sel.a && i < sel.b ? " sel" : ""));
                if(gapR) out += piece(R, pos(i + 1) - (pos(i + 1) - p) / 3, " hist gap" + (i >= sel.a && i + 1 <= sel.b ? " sel" : ""),
                    "No entering class " + (stops[i] - stops[i + 1] > 2 ? (stops[i + 1] + 1) + "–" + (stops[i] - 1) : stops[i] - 1));
            }
            var near = (sel.b - sel.a) / (last || 1) * W < 110;
            var label = function(at, text, cls){ return "<span class='sl-lab" + (cls ? " " + cls : "") + "' style='left:" + at + "%'>" + text + "</span>"; };
            if(near) out += label((pos(sel.a) + pos(sel.b)) / 2, classLabel(stops[sel.a]) + (sel.a === sel.b ? "" : " · " + classLabel(stops[sel.b])));
            else out += label(pos(sel.a), classLabel(stops[sel.a])) + label(pos(sel.b), classLabel(stops[sel.b]));
            if(sel.a > 0 && pos(sel.a) / 100 * W > 90) out += label(0, stops[0], "sl-end");
            if(sel.b < last && (100 - pos(sel.b)) / 100 * W > 90) out += label(100, stops[last], "sl-end");
            [["a", "Newest class shown"], ["b", "Oldest class shown"]].forEach(function(d){
                var i = sel[d[0]];
                out += "<button type='button' class='sl-dot' data-end='" + d[0] + "' role='slider' aria-label='" + d[1] + "' aria-valuetext='" + classLabel(stops[i]) + "' style='left:" + pos(i) + "%'></button>";
            });
            el.innerHTML = out;
            el.setAttribute("data-stops", stops.length);
        }

        function renderCohorts(){
            var bounds = rangeBounds(), from = bounds[0], to = bounds[1];
            var rows = cohorts().filter(function(c){ return c.ay >= from && c.ay <= to; }).sort(function(a, b){ return b.ay - a.ay; });
            var shown = rows;
            document.getElementById("cohort-note").textContent = rows.length + (rows.length === 1 ? " cohort" : " cohorts");
            drawSlider();
            /* Each enrolled student sits at one stage (stageOf). A stage count is "stalled" when the class is past the year
               students should have moved beyond it. The total is a dot strip: one dot per student who entered. */
            var fc = focuser(view.highlight), selClass = focusClass(view.highlight);
            var selStudent = view.highlight && view.highlight.indexOf("student:") === 0 ? data.students[parseInt(view.highlight.slice(8), 10)] : null;
            var dotStrip = function(c, enrolled){
                var sorted = enrolled.slice().sort(function(a, b){ return stageOf(a) - stageOf(b) || a.name.localeCompare(b.name); });
                var dots = sorted.map(function(s){
                    var st = isStalled(s);
                    return "<i class='sdot" + (fc && fc(s) ? " ring" : "") + "' data-student='" + s.idx + "' style='background:" + (st ? STALLED_DOT : ON_DOT) + "' data-tip='" + esc(STAGE_SHORT[stageOf(s)] + (st ? " (stalled)" : "")) + "'>" + esc(initials(s.name)) + "</i>";
                });
                var entered = Math.max(c.entered, enrolled.length); /* safety net: the history and the roster should agree */
                var formers = c.formers || [];
                for(var k = 0; k < entered - enrolled.length; k++){
                    var f = formers[k];
                    dots.push(f ? "<i class='sdot gone' data-former='" + k + "' style='box-shadow:inset 0 0 0 2px " + OUTCOME[f.outcome].ring + ";color:" + OUTCOME[f.outcome].text + "'>" + (settings.formerInitials ? esc(initials(f.name)) : "") + "</i>" : "<i class='sdot gone' title='Entered, no longer enrolled'></i>");
                }
                var grouped = "";
                for(var g = 0; g < dots.length; g += 5) grouped += "<span class='dgrp'>" + dots.slice(g, g + 5).join("") + "</span>";
                return "<td class='blk strip-cell'><div class='stripwrap'><span class='striptext'><strong class='stnum'>" + enrolled.length + "</strong><span class='small stof'>of " + entered + "</span></span>"
                    + "<span class='strip'>" + grouped + "</span></div></td>";
            };
            var enrolledNow = 0, phdYears = [], phdCount = 0, leftCount = 0, maCount = 0;
            var body = shown.map(function(c){
                var year = currentAY - c.ay + 1;
                var members = roster().filter(function(s){ return s.cohort === c.ay && !s.nonDegree; });
                var enrolled = members.filter(function(s){ return stageOf(s) !== null; });
                var stages = [0, 0, 0, 0];
                enrolled.forEach(function(s){ stages[stageOf(s)]++; });
                enrolledNow += enrolled.length;
                phdYears = phdYears.concat(c.phdYears || []);
                phdCount += c.phd; leftCount += c.left; maCount += c.maOnly;
                var key = "cohort:" + c.ay;
                var stageCells = stages.map(function(n, i){
                    var cls = i === 0 ? "blk " : "";
                    if(!n) return "<td class='" + cls + "st-none'>·</td>";
                    var due = moveOnBy(i), stalled = due !== null && year > due;
                    var share = n / enrolled.length;
                    var bg = stalled ? "rgba(217,119,6," + (0.16 + 0.5 * share).toFixed(2) + ")" : "rgba(75,46,131," + (0.08 + 0.34 * share).toFixed(2) + ")";
                    var sel = view.highlight === "stage:" + c.ay + ":" + i || (selStudent && selStudent.cohort === c.ay && stageOf(selStudent) === i);
                    return "<td class='" + cls + "sc " + (stalled ? "c-late" : "st-on") + (sel ? " sel" : "") + "' data-stage='" + i + "' style='background:" + bg + "'>" + n + "</td>";
                }).join("");
                var flagged = members.filter(function(s){ return flagsFor(s).length > 0; }).length;
                var outcomeCell = function(n, key, first){ return "<td class='" + (key === "phd" ? "phdpair " : "") + (n ? "oc" : "st-none") + "'" + (n ? " style='color:" + OUTCOME[key].text + "'" : "") + ">" + (n || "·") + "</td>"; };
                return "<tr data-cohort='" + key + "' class='" + (selClass === c.ay ? "c-active" : "") + "'><td title='Click to highlight this class below'><strong>" + classLabel(c.ay) + "</strong></td><td>" + year + "</td>"
                    + stageCells
                    + dotStrip(c, enrolled)
                    + (flagged ? "<td class='blk flagcell" + (view.highlight === "flagged:" + c.ay ? " sel" : "") + "'>" + flagged + "</td>" : "<td class='blk st-none'>·</td>") + "<td class='spc'></td>"
                    + outcomeCell(c.left, "left", true) + outcomeCell(c.maOnly, "ma") + outcomeCell(c.phd, "phd")
                    + ["mean", "median"].map(function(stat){ var ys = c.phdYears || [], v = ys.length ? (stat === "mean" ? mean(ys) : median(ys)) : null; return "<td class='phdpair'>" + (v === null ? "<span class='small'>–</span>" : v.toFixed(1)) + "</td>"; }).join("") + "</tr>";
            });
            var outcomeHead = function(key, label, arrow){
                return "<span class='ohd'>" + (key ? "<i class='sdot gone' style='box-shadow:inset 0 0 0 2px " + OUTCOME[key].ring + "'></i>" : "") + "<span>" + label + "</span>" + (arrow ? "<span>→</span>" : "") + "</span>";
            };
            var head = "<th class='fit'>Entering<br>class</th><th class='nc snug'>Year</th><th class='blk oh nc'>" + outcomeHead(null, "Pre-MA", true) + "</th><th class='oh nc'>" + outcomeHead(null, "MA<br>done", true) + "</th>"
                + "<th class='oh nc'>" + outcomeHead(null, "Committee", true) + "</th><th class='oh nc'>" + outcomeHead(null, "Candidate") + "</th>"
                + "<th class='blk' style='text-align:left' title='Students from this class enrolled now, of those who entered: one dot per student'>Total</th><th class='blk nc tight snug'>Flagged</th><th class='spc'></th>"
                + "<th class='oh nc'>" + outcomeHead("left", "Left,<br>no degree", true) + "</th><th class='oh nc'>" + outcomeHead("ma", "Left<br>with MA", true) + "</th>"
                + "<th class='phdpair oh nc'>" + outcomeHead("phd", "PhD<br>awarded") + "</th>";
            document.getElementById("cohorts").innerHTML = "<thead><tr><th class='grp'></th><th class='grp'></th><th class='grp blk now' colspan='6'>Currently enrolled</th><th class='grp spc'></th><th class='grp gone' colspan='5'>No longer enrolled</th></tr>"
                + "<tr>" + head.replace(/<th /g, "<th rowspan='2' ") + "<th class='phdpair yrs' colspan='2' title='For the PhDs awarded in this class. National median for philosophy: 6.8–7.0 years (NSF Survey of Earned Doctorates, 2024–25)'>Years<br>to PhD</th></tr>"
                + "<tr><th class='phdpair yrs-sub'>Mean</th><th class='phdpair yrs-sub'>Median</th></tr></thead><tbody>"
                + (body.join("") || "<tr><td colspan='14' class='small'>" + (!data.cohorts.length ? "No admission dates in MyGrad's records."
                    : !cohorts().length ? "No entering classes on record for this program. Certificate and non-matriculated students aren't counted in entering classes."
                    : "No entering classes " + (view.program === "all" ? "" : "in this program ") + "in the years selected.") + "</td></tr>") + "</tbody>"
                + (body.length ? "<tfoot><tr><td></td><td></td><td class='blk'></td><td></td><td></td><td></td>"
                    + "<td class='blk strip-cell sum' title='Enrolled now, in the classes shown (the filled dots)'><div class='stripwrap'><span class='striptext'><strong class='stnum'>" + enrolledNow + "</strong><span class='small stof'>in program</span></span></div></td>"
                    + "<td class='blk'></td><td class='spc'></td>"
                    + "<td class='sum-med' title='Left with no degree, in the classes shown'><strong>" + leftCount + "</strong></td><td class='sum-med' title='Left with an MA, in the classes shown'><strong>" + maCount + "</strong></td>"
                    + "<td class='phdpair sum-med' title='PhDs awarded in the classes shown'><strong>" + phdCount + "</strong></td>"
                    + ["mean", "median"].map(function(stat){
                        if(!phdYears.length) return "<td class='phdpair sum-med'></td>";
                        return "<td class='phdpair sum-med' title='" + (stat === "mean" ? "Mean" : "Median") + " of all " + phdYears.length + " PhDs in the classes shown, each PhD counted once (not an average of the rows)'><strong>" + (stat === "mean" ? mean(phdYears) : median(phdYears)).toFixed(1) + "</strong></td>";
                    }).join("")
                    + "</tr>" + (function(){
                        var t = outcomeStats(shown), x = exited(t), parts = outcomeParts(t);
                        document.getElementById("cohort-outcomes").innerHTML = parts.length ? "<strong>Cohorts shown:</strong> " + parts.join("<span class='sep'>·</span>") : "";
                        return "<tr class='rates'><td></td><td></td><td class='blk'></td><td></td><td></td><td></td><td class='blk'></td><td class='blk'></td><td class='spc'></td>"
                            + "<td class='rate' title='Shares of the " + x + " no longer enrolled; the three add to 100%'>" + exitShares(t).left + "</td><td class='rate' title='Shares of the " + x + " no longer enrolled; the three add to 100%'>" + exitShares(t).ma + "</td>"
                            + "<td class='phdpair rate' title='" + esc(t.enrolled ? PARTIAL_HOVER : "Share of the " + x + " no longer enrolled") + "'>" + phdShare(t) + "</td><td class='phdpair'></td><td class='phdpair'></td></tr>"
                            /* The note behind the asterisk sits under the No longer enrolled block, beside the starred share. */
                            + (t.enrolled ? "<tr class='star'><td colspan='9'></td><td colspan='5' title='" + esc(PARTIAL_HOVER) + "'>" + partialNote(t) + "</td></tr>" : "");
                    })() + "</tfoot>" : "");
        }

        function highlightNote(list, where){
            if(!view.highlight) return "";
            var hl = highlighter(view.highlight), fc = focuser(view.highlight);
            var count = list.filter(hl).length, label = esc(highlightLabel(view.highlight));
            var ay = focusClass(view.highlight), text;
            if(view.highlight.indexOf("student:") === 0) text = list.some(fc) ? " · Singled out: " + label : " · " + label + " isn't " + where;
            else if(count > 0) text = " · Highlighting: " + label + " (" + count + " " + where + ")" + (fc ? " · " + list.filter(fc).length + " singled out" : "");
            else text = " · " + (ay !== null ? "No current students from the " + esc(classLabel(ay)) + " class " + where + "; see its history in Entering classes" : "No " + label.toLowerCase() + " students " + where);
            return "<span class='hl-text'>" + text + "</span> <a href='#' class='hl-clear'>Clear</a>";
        }
        /* Program summary: every current student, whatever the chart, the table range or the Students filters.
           Four groups, each a headline number and what it is made of; every number highlights its students below. */
        /* Outcomes for a set of cohorts, shared by the summary (the latest 10 cohorts) and Entering classes (the cohorts shown),
           so the two match exactly whenever the slider shows the latest 10. The outcome shares are of everyone no longer enrolled
           (earned PhD + left with MA + left with no degree = 100%), marked * while anyone is still enrolled. */
        function outcomeStats(cohorts){
            var t = { entered: 0, enrolled: 0, left: 0, ma: 0, phd: 0, leftCand: 0, years: [], listedEntered: 0, listedPhd: 0, listedGone: 0 };
            cohorts.forEach(function(c){
                var enrolled = roster().filter(function(s){ return s.cohort === c.ay && !s.nonDegree && stageOf(s) !== null; }).length, entered = Math.max(c.entered, enrolled);
                t.entered += entered; t.enrolled += enrolled; t.left += c.left; t.ma += c.maOnly; t.phd += c.phd; t.leftCand += c.leftCand || 0;
                t.listedEntered += c.listedEntered || 0; t.listedPhd += c.listedPhd || 0; t.listedGone += (c.listedMa || 0) + (c.listedLeft || 0);
                t.years = t.years.concat(c.phdYears || []);
            });
            return t;
        }
        function pct(n, d){ return d ? Math.round(n / d * 100) + "%" : "–"; }
        function exited(t){ return t.phd + t.ma + t.left; }
        /* Shares of everyone no longer enrolled, rounded so the three always add to exactly 100% (largest remainder). */
        function exitShares(t){
            var x = exited(t), raw = { phd: t.phd, ma: t.ma, left: t.left }, out = {}, used = 0, keys = ["phd", "ma", "left"];
            if(!x) return { phd: "–", ma: "–", left: "–" };
            keys.forEach(function(k){ out[k] = Math.floor(raw[k] / x * 100); used += out[k]; });
            keys.slice().sort(function(a, b){ return (raw[b] / x * 100 - out[b]) - (raw[a] / x * 100 - out[a]); }).slice(0, 100 - used).forEach(function(k){ out[k]++; });
            keys.forEach(function(k){ out[k] += "%"; });
            return out;
        }
        /* The PhD share of everyone no longer enrolled; * while some are still enrolled (a partial sample so far). */
        function phdShare(t){ return exitShares(t).phd + (t.enrolled ? "*" : ""); }
        function partialNote(t){ return "* Partial sample: " + (exited(t) ? t.phd + " of " + exited(t) + " earned PhD" : "no one has finished or left yet") + "; " + t.enrolled + " still enrolled"; }
        var PARTIAL_HOVER = "Of students who have finished or left so far. Those still enrolled count once they finish or leave. Early leavers show up before later finishers, so this tends to read low until the cohorts are 10 years in.";
        /* Under the table: the candidacy lines (when MyGrad records candidacy) and the note behind the asterisk. A 10-year completion
           rate used to lead this line; it was dropped because it counted students still enrolled past year 10 as non-completers. */
        function outcomeParts(t){ return candidacyParts(t); }
        /* Only students with MyGrad detail records count here: those found only on MyGrad's quarter lists have no candidacy record. */
        function candidacyParts(t){
            if(!candidacyKnown) return [];
            var entered = t.entered - t.listedEntered, phd = t.phd - t.listedPhd, gone = t.left + t.ma - t.listedGone;
            var only = t.listedEntered ? " Counts only students with MyGrad detail records: the " + t.listedEntered + " found only on MyGrad's quarter lists have no candidacy record." : "";
            var out = ["<span title='" + esc(only.trim()) + "'>Left before candidacy <b>" + pct(gone - t.leftCand, entered) + "</b> · after <b>" + pct(t.leftCand, entered) + "</b></span>"];
            if(phd + t.leftCand) out.push("<span title='Of candidates who have finished or left. Nationally about 80% of candidates finish (Bowen & Rudenstine, an older estimate)." + esc(only) + "'><b>" + pct(phd, phd + t.leftCand) + "</b> of candidates finished <span class='small'>(" + phd + " of " + (phd + t.leftCand) + " who finished or left)</span></span>");
            return out;
        }
        function renderSummary(all){
            var n = function(k){ return all.filter(groups[k][1]).length; };
            var btn = function(k, count, label, cls){
                var on = view.highlight === k;
                return "<button type='button' class='sm-n" + (cls ? " " + cls : "") + (on ? " on" : "") + "' data-key='" + k + "' aria-pressed='" + on + "'><b>" + count + "</b>" + (label ? " " + label : "") + "</button>";
            };
            var section = function(head, big, parts){ return "<section><h4>" + head + "</h4><div class='sm-big'>" + big + "</div>" + parts + "</section>"; };
            var flow = all.filter(groups.inprogram[1]), stalled = flow.filter(isStalled).length;
            var order = ["Doctoral", "Master's"], levels = [];
            flow.forEach(function(s){ if(levels.indexOf(s.level) === -1) levels.push(s.level); });
            levels.sort(function(a, b){ var i = order.indexOf(a), j = order.indexOf(b); return (i < 0 ? 9 : i) - (j < 0 ? 9 : j) || a.localeCompare(b); });
            var others = [["certificate", "certificate"], ["nonmatric", "non-matriculated"], ["nodetails", "without MyGrad details"], ["noadmit", "without an admission date"]]
                .filter(function(o){ return n(o[0]); }).map(function(o){ return btn(o[0], n(o[0]), o[1]); }).join("");
            var finished = data.students.filter(function(s){ return s.done && inProgram(s.program); }).length;
            if(finished) others += "<span class='sm-note' title='Their PhD is awarded, so they appear in the Entering classes history (a green hollow dot), not in Students'><b>" + finished + "</b> finished the PhD</span>";
            document.getElementById("stats").innerHTML = section("In the program" + (levels.length ? ": " + levels.map(function(lv){ return esc(LEVEL_SHORT[lv] || lv); }).join(", ").replace(/, ([^,]*)$/, " and $1") : ""), btn("inprogram", flow.length, "", "big"),
                    "<div class='sm-parts'>" + levels.map(function(lv){ return btn("level:" + levelSlug(lv), flow.filter(function(s){ return s.level === lv; }).length, esc(LEVEL_SHORT[lv] || lv)); }).join("") + (levels.length ? "<span class='sm-sep'></span>" : "") + btn("onschedule", flow.length - stalled, "on schedule") + btn("stalled", stalled, "stalled", "late") + "</div>"
                    + (others ? "<div class='sm-parts sm-others'><span class='sm-note'>Also on MyGrad's list:</span>" + others + "</div>" : ""))
                + section("Flagged", btn("flagged", n("flagged"), "", "big late"), "<div class='sm-parts'><span class='sm-note'>any flag in Students, including everyone stalled</span></div>")
                + section("Funded now", btn("funded", n("funded"), "", "big"), "<div class='sm-parts'><span class='sm-note'>TA position or fellowship this quarter</span></div>"
                    + "<div class='sm-parts' title='Cleared to teach, speaking requirement met, and no TA position or fellowship this quarter'>" + btn("available", n("available"), n("available") === 1 ? "other available to TA" : "others available to TA") + "</div>")
                + (function(){
                    var from = newestAY - 9, t = outcomeStats(cohorts().filter(function(c){ return c.ay >= from; }));
                    var avg = t.years.length ? mean(t.years).toFixed(1) : "–";
                    return "<section class='sm-out'><h4><button type='button' class='sm-win' title='Show these cohorts in Entering classes'>Outcomes · " + classLabel(from) + " to " + classLabel(newestAY) + "</button></h4>"
                        + "<div class='sm-bigs'><div class='sm-stat' title='" + esc(t.enrolled ? PARTIAL_HOVER : "") + "'><div class='sm-big'>" + phdShare(t) + "</div><div class='sm-parts'><span class='sm-note'>earned the PhD, of those who started</span></div></div>"
                        + "<div class='sm-stat' title='Mean years from starting to the PhD, for the " + t.years.length + " PhDs in these cohorts. National median for philosophy: 6.8–7.0 years (NSF Survey of Earned Doctorates).'><div class='sm-big'>" + avg + "</div><div class='sm-parts'><span class='sm-note'>avg years to PhD</span></div></div></div>"
                        + "<div class='sm-lines'><span>The rest left the program: <b>" + exitShares(t).ma + "</b> with an MA · <b>" + exitShares(t).left + "</b> with no degree</span>"
                        + candidacyParts(t).join("") + (t.enrolled ? "<span class='sm-foot'>" + partialNote(t) + "</span>" : "") + "</div></section>";
                })();
        }
        function render(){
            var all = roster();
            var hl = highlighter(view.highlight);
            renderSummary(all);
            document.getElementById("hl-note").innerHTML = highlightNote(visible(), "in Students");
            var fc = focuser(view.highlight);

            /* View buttons in the section bar, with counts; "Limited info" appears only when someone has no MyGrad details. */
            var views = [["inprogram", "In the program", all.filter(function(s){ return stageOf(s) !== null; }).length], ["flagged", "Flagged", all.filter(function(s){ return flagsFor(s).length > 0; }).length],
                    ["limited", "Limited info", all.filter(function(s){ return !s.d; }).length], ["all", "All", all.length]]
                .filter(function(v){ return v[0] !== "limited" || v[2] || view.show === "limited"; });
            var mine = data.students.filter(function(s){ return inProgram(s.program); });
            var onList = mine.filter(function(s){ return s.onRoster; }).length, finishedAll = mine.filter(function(s){ return s.done; }).length, extra = mine.filter(function(s){ return !s.onRoster && !s.done; }).length;
            var allTip = "MyGrad's " + data.rosterQuarter + " By Quarter lists, combined" + (view.program === "all" ? "" : ", this program only") + ": " + onList + (finishedAll ? " · minus " + finishedAll + " who finished the PhD (shown in Entering classes)" : "") + (extra ? " · plus " + extra + " on MyGrad's current list but on neither quarter's list" : "");
            document.getElementById("show-seg").innerHTML = views.map(function(v){ var on = view.show === v[0]; return "<button type='button' data-show='" + v[0] + "' aria-pressed='" + on + "'" + (v[0] === "all" ? " title='" + esc(allTip) + "'" : "") + (on ? " class='on'" : "") + ">" + v[1] + " <b>" + v[2] + "</b></button>"; }).join("");
            /* By cohort: a first column labels each entering class once, with a continuous line down beside its students; the Year
               column repeats it, so it is dropped. Rows keep the chosen sort within each cohort. */
            var grouped = view.groupByClass;
            var cols = [["name", "Student"], ["stage", "Stage"], ["program", "Program"], ["year", "Year"], ["status", "Status"], [null, "Advisor"], [null, "Milestones"], [null, "Funding now"], ["flags", "Flags"]]
                .filter(function(c){ return !(grouped && c[0] === "year"); });
            if(grouped) cols.unshift([null, "Cohort"]);
            var row = function(s, lead){
                var d = s.d;
                var name = s.link ? "<a href='" + esc(s.link) + "' target='_blank' rel='noopener'>" + esc(s.name) + "</a>" : esc(s.name);
                var status = esc(s.overall) + "<div class='small'>" + esc(s.quarter) + (s.credits !== "" && s.credits !== null && s.credits !== undefined ? " · " + esc(s.credits) + " cr" : "") + "</div>";
                var admitted = d && d.GradAdmitYr ? "<div class='small'>since " + esc(d.GradAdmitQtr + " " + d.GradAdmitYr) + "</div>" : "";
                var flags = flagsFor(s).map(function(f){ return chip(f[0], f[1]); }).join("") + notes(s);
                var lit = !!(fc && fc(s));
                return "<tr class='" + (d ? "" : "limited") + (hl && hl(s) ? " hl" + (fc && !lit ? " soft" : "") : "") + (lit ? " focus" : "") + "'>" + (lead || "") + "<td class='nm'>" + name + "</td><td>" + connector(s, lit) + "</td><td>" + esc(s.level) + "<div class='small'>" + esc(s.program) + "</div></td>"
                    + (grouped ? "" : "<td>" + (s.year === null ? "—" : s.year) + admitted + "</td>") + "<td>" + status + "</td><td>" + (d ? lines(d.AdvisorChair).map(esc).join("<br>") || "—" : "") + "</td><td>" + milestones(s)
                    + "</td><td>" + funding(s) + "</td><td>" + flags + "</td></tr>";
            };
            var cohortCell = function(label, meta, members, ay){
                var flagged = members.filter(function(s){ return flagsFor(s).length > 0; }).length;
                return "<td class='coh" + (ay === null ? " other" : focusClass(view.highlight) === ay ? " c-active" : "") + "' rowspan='" + members.length + "'" + (ay !== null ? " data-cohort='cohort:" + ay + "' title='Click to highlight this cohort'" : "") + ">"
                    + "<span class='coh-bar'></span><div class='coh-label'><b>" + label + "</b><span>" + meta + "</span><span>" + members.length + (members.length === 1 ? " student" : " students")
                    + "</span>" + (flagged ? "<span><em>" + flagged + " flagged</em></span>" : "") + "</div></td>";
            };
            var group = function(members, lead){ return members.map(function(s, i){ return row(s, i ? "" : lead); }).join(""); };
            var list = visible(), rows;
            if(grouped){
                var byClass = {}, other = [];
                list.forEach(function(s){ if(s.cohort === null || s.nonDegree) other.push(s); else (byClass[s.cohort] = byClass[s.cohort] || []).push(s); });
                rows = Object.keys(byClass).map(Number).sort(function(a, b){ return b - a; }).map(function(ay){
                    return group(byClass[ay], cohortCell(classLabel(ay), "Year " + (currentAY - ay + 1), byClass[ay], ay));
                });
                if(other.length){
                    var why = [["certificate", function(s){ return s.level === "Certificate"; }], ["non-matriculated", function(s){ return s.level === "Non-matriculated"; }],
                        ["no MyGrad details", function(s){ return !s.d; }], ["no admission date", function(s){ return !!s.d && !s.nonDegree && s.cohort === null; }]]
                        .map(function(w){ var n = other.filter(w[1]).length; return n ? n + " " + w[0] : ""; }).filter(Boolean).join(", ");
                    rows.push(group(other, cohortCell("No cohort", why, other, null)));
                }
            } else rows = list.map(function(s){ return row(s); });
            document.getElementById("roster").classList.toggle("by-cohort", grouped);
            document.getElementById("roster").innerHTML = "<thead><tr>" + cols.map(function(c){
                return "<th" + (c[0] ? " data-sort='" + c[0] + "' title='Sort'" : " style='cursor:default'") + ">" + c[1] + (view.sort === c[0] ? (view.dir === 1 ? " ▲" : " ▼") : "") + "</th>";
            }).join("") + "</tr></thead><tbody>" + (rows.join("") || "<tr><td colspan='" + cols.length + "' class='small'>No students match.</td></tr>") + "</tbody>";

            renderCohorts();
        }

        document.body.innerHTML = "<header><h1>MyGradMod</h1><p><span title='Students and their statuses come from MyGrad’s By Quarter lists for the current quarter and the next one, whatever quarter the MyGrad page shows'>MyGrad’s " + esc(data.rosterQuarter) + " lists</span> + student details · loaded " + esc(now.toLocaleString()) + "</p>"
            + "<select id='program' aria-label='Program' title='Show one program throughout the page: summary, Entering classes and Students'><option value='all'>All programs</option></select>"
            + "<button type='button' id='settings-btn' aria-expanded='false' aria-controls='settings' aria-label='Settings' title='Settings'>⚙</button>"
            + "<div id='settings' hidden><div class='set-head'><strong>Flag thresholds</strong><span class='small'>Year in program; year 1 = first year. Defaults follow the Graduate Handbook.</span></div><div class='set-grid'>"
            + "<label>Still in MA phase after year <input type='number' min='1' max='6' id='maBy'></label>"
            + "<label>No advisor after year <input type='number' min='1' max='10' id='advisorBy'></label>"
            + "<label>No doctoral committee after year <input type='number' min='1' max='10' id='docCommBy'></label>"
            + "<label>Not a candidate after year <input type='number' min='1' max='10' id='phcBy'></label>"
            + "<label>No reading committee after year <input type='number' min='1' max='10' id='readingBy'></label>"
            + "<label>Guaranteed funding covers years 1 to <input type='number' min='1' max='10' id='fundingYears'></label>"
            + "<label>Doctoral time-limit warning from year <input type='number' min='1' max='10' id='docWarn'></label>"
            + "<label>Master's time-limit warning from year <input type='number' min='1' max='6' id='mastersWarn'></label>"
            + "<label><span><input type='checkbox' id='gpaOn'> Flag GPA below</span><input type='number' step='0.1' min='0' max='4' id='gpaMin'></label>"
            + "</div><div class='set-head'><strong>Display</strong></div>"
            + "<label class='set-line'><input type='checkbox' id='allYears'> Show every year on the Entering classes slider</label><p class='small set-note' id='skipped-note'></p>"
            + "<label class='set-line'><input type='checkbox' id='formerInitials'> Show initials on former students' dots</label><p class='small set-note'>Off by default: otherwise a former student's name shows only when you hover their hollow dot.</p>"
            + "<button type='button' class='pill' id='reset'>Reset to defaults</button></div></header>"
            + (data.detailLoaded ? "" : "<div class='bar' style='border-left-color:#b91c1c'>Couldn't load student details from MyGrad, so milestones, committees and funding are missing. Status flags still work.</div>")
            + "<div class='summary' id='stats'></div>"
            + "<div class='panel' id='panel-classes'><h2 class='dark-head classes-head'><button type='button' class='panel-toggle' data-panel='classes' aria-expanded='true' aria-controls='body-classes' title='Collapse or expand this section'><span class='chev'>▼</span>Entering classes</button>"
            + "<div id='class-slider' role='group' aria-label='Entering classes shown in the table' title='Drag a dot, or drag the stretch between them. Double-click to reset.'></div><span id='cohort-note' class='small'></span><span id='hist-status' class='small'></span></h2><div class='panel-body' id='body-classes'>"
            + "<table id='cohorts'></table><p id='cohort-outcomes' class='outcomes'></p>"
            + "</div></div>"
            + "<div class='panel' id='panel-students'><h2 class='dark-head'><button type='button' class='panel-toggle' data-panel='students' aria-expanded='true' aria-controls='body-students' title='Collapse or expand this section'><span class='chev'>▼</span>Students</button>"
            + "<span class='seg' id='show-seg' role='group' aria-label='Which students'></span><span class='bar-fill'></span>"
            + "<input type='search' id='search' placeholder='Search name or advisor'>"
            + "<label class='bar-opt'><input type='checkbox' id='group-by-class'> By cohort</label></h2>"
            + "<div class='panel-body' id='body-students'><div id='hl-note' class='hl-line small'></div><table id='roster'></table></div></div>"
            + "<div id='tip' role='tooltip'></div>"
            + "<footer>These are student records protected by FERPA. For authorized faculty and staff only; don't share or screenshot outside that group. "
            + "Nothing is saved except your threshold settings; close this tab when you're done. Year in program counts academic years from the admission quarter and doesn't subtract leave. "
            + "Default thresholds follow the Philosophy Graduate Handbook timeline, whose benchmarks pause during official leave; the 10-year doctoral and 6-year master's limits (Grad School policy) include leave. "
            + "Check a student's leave history and the current policies before acting on a flag.</footer>";

        /* Every program on MyGrad's list or in the entering-class history, spelled as current students' records spell it. */
        function fillPrograms(){
            var programs = {}, select = document.getElementById("program");
            data.students.concat(data.cohorts).forEach(function(x){ var k = progKey(x.program); if(k && !programs[k]) programs[k] = x.program; });
            if(phdProgram() && programs[progKey(phdProgram())]) programs[progKey(phdProgram())] = phdProgram();
            while(select.options.length > 1) select.remove(1);
            Object.keys(programs).sort(function(a, b){ return programs[a].localeCompare(programs[b]); }).forEach(function(k){
                var o = document.createElement("option"); o.value = k; o.textContent = programs[k]; select.appendChild(o);
            });
            select.value = view.program;
        }
        fillPrograms();

        ["maBy", "advisorBy", "docCommBy", "phcBy", "readingBy", "fundingYears", "docWarn", "mastersWarn", "gpaMin"].forEach(function(k){
            var el = document.getElementById(k);
            el.value = settings[k];
            el.addEventListener("change", function(){ var v = parseFloat(el.value); if(!isNaN(v)){ settings[k] = v; save(); render(); } });
        });
        var allYears = document.getElementById("allYears");
        function updateSkippedNote(){
            var skipped = skippedYears();
            document.getElementById("skipped-note").textContent = skipped.length ? "Years with no entering class are skipped: " + skipped.join(", ") + "." : "No years are skipped: every year from " + oldestAY + " to " + newestAY + " has a class.";
        }
        updateSkippedNote();
        allYears.checked = settings.allYears;
        allYears.addEventListener("change", function(){
            settings.allYears = allYears.checked; save();
            /* Keep the selection on class years when empty years drop out. */
            var r = rangeBounds(), inside = classYears.concat([newestAY]).filter(function(y){ return y >= r[0] && y <= r[1]; });
            if(!settings.allYears && inside.length) view.range = { from: Math.min.apply(null, inside), to: Math.max.apply(null, inside) };
            renderCohorts();
        });
        var formerInitials = document.getElementById("formerInitials");
        formerInitials.checked = settings.formerInitials;
        formerInitials.addEventListener("change", function(){ settings.formerInitials = formerInitials.checked; save(); renderCohorts(); });
        var gpaOn = document.getElementById("gpaOn");
        gpaOn.checked = settings.gpaOn;
        gpaOn.addEventListener("change", function(){ settings.gpaOn = gpaOn.checked; save(); render(); });
        document.getElementById("reset").addEventListener("click", function(){
            settings = Object.assign({}, defaults); save();
            Object.keys(defaults).forEach(function(k){ var el = document.getElementById(k); if(el.type === "checkbox") el.checked = settings[k]; else el.value = settings[k]; });
            render();
        });
        function save(){ try { localStorage.setItem("grad-monitor-settings", JSON.stringify(settings)); } catch(e){} }

        /* The full history arrives from the MyGrad tab after the dashboard opens (loadListHistory): progress by year, then
           former students found only on MyGrad's quarter lists, added to their entering classes. */
        /* A toast while the history loads, so nobody wonders why Entering classes changes a minute later; × hides it. */
        var histToast = null;
        function toast(html, fade){
            if(histToast === false) return;
            if(histToast === null){
                histToast = document.createElement("div");
                histToast.className = "hist-toast";
                histToast.setAttribute("role", "status");
                histToast.innerHTML = "<span class='t'></span><button type='button' aria-label='Hide'>×</button>";
                histToast.querySelector("button").addEventListener("click", function(){ histToast.remove(); histToast = false; });
                document.body.appendChild(histToast);
            }
            histToast.querySelector(".t").innerHTML = html;
            if(fade) setTimeout(function(){ if(histToast){ histToast.classList.add("gone"); setTimeout(function(){ if(histToast) histToast.remove(); }, 450); } }, fade);
        }
        window.mygradmodHistory = function(msg){
            var el = document.getElementById("hist-status");
            if(msg.progress){
                toast("Adding the program’s full history from MyGrad’s quarter lists: about a minute. Keep the MyGrad tab open. <b>" + msg.progress + "</b>");
                el.textContent = "· Adding history from MyGrad’s quarter lists… " + msg.progress;
                el.title = "Reading every quarter’s list back to the program’s first: about a minute. Keep the MyGrad tab open until it finishes.";
                return;
            }
            data.cohorts = data.cohorts.concat(msg.cohorts || []);
            mergedFor = null;
            historyDerived();
            fillPrograms();
            updateSkippedNote();
            el.textContent = msg.found ? "· " + msg.found + " more from MyGrad’s quarter lists" : "";
            toast(msg.found ? "Full history added: <b>" + msg.found + "</b> more former students in Entering classes." : "Full history checked: no more former students found.", 6000);
            el.title = msg.found ? msg.found + " former students have no MyGrad detail record, only entries on its quarter lists (which go back to " + msg.oldest + "). Each counts in the entering class of their first quarter in the PhD or MA program. "
                + "PhD: their last list entry says Graduated, with the Doctor of Philosophy title (true of 16 of 17 PhDs with detail records). Otherwise they left, with an MA if a list shows them Graduated in the Master of Arts program (MyGrad’s lists rarely record an MA). The candidacy lines leave them out." : "";
            render();
        };

        /* Instant hover popup for stage cells and dots: who a click would single out. */
        var tipEl = document.getElementById("tip");
        function showTip(html, e){
            tipEl.innerHTML = html;
            tipEl.style.display = "block";
            var x = e.clientX + 14, y = e.clientY + 16, w = tipEl.offsetWidth, h = tipEl.offsetHeight;
            if(x + w > window.innerWidth - 8) x = e.clientX - w - 14;
            if(y + h > window.innerHeight - 8) y = e.clientY - h - 12;
            tipEl.style.left = x + "px";
            tipEl.style.top = y + "px";
        }
        function hideTip(){ tipEl.style.display = "none"; }
        document.getElementById("cohorts").addEventListener("mousemove", function(e){
            var tr = e.target.closest("tr[data-cohort]"), cell = e.target.closest("td.sc[data-stage]"), dot = e.target.closest(".sdot[data-student]");
            var flagCell = e.target.closest("td.flagcell"), former = e.target.closest(".sdot[data-former]");
            if(!tr || (!cell && !dot && !flagCell && !former)) return hideTip();
            var ay = parseInt(tr.getAttribute("data-cohort").slice(7), 10);
            if(flagCell){
                var flaggedStudents = roster().filter(function(s){ return s.cohort === ay && !s.nonDegree && flagsFor(s).length > 0; }).sort(function(a, b){ return a.name.localeCompare(b.name); });
                return showTip("<div class='th'>" + esc(classLabel(ay) + " · " + flaggedStudents.length + " flagged") + "</div><ul>"
                    + flaggedStudents.map(function(s){ return "<li class='tn'>" + esc(s.name) + " <span style='color:#cbbfe6'>— " + esc(flagsFor(s).map(function(f){ return f[1]; }).join(", ")) + "</span></li>"; }).join("") + "</ul>", e);
            }
            if(former){
                var fc0 = cohorts().filter(function(c){ return c.ay === ay; })[0], fr = fc0 && fc0.formers[parseInt(former.getAttribute("data-former"), 10)];
                if(!fr) return hideTip();
                var took = fr.outcome === "phd" && typeof fr.years === "number" ? "<div class='tn'>" + Math.round(fr.years * 100) / 100 + " years to PhD</div>" : "";
                return showTip("<div class='th'" + (took ? "" : " style='margin:0'") + ">" + esc(fr.name + " · " + OUTCOME[fr.outcome].label + (fr.outcome === "left" ? (fr.when ? (fr.fromLists ? ", last on MyGrad's lists " : ", last enrolled ") + fr.when : "") : fr.when ? " " + fr.when : "")) + "</div>" + took
                    + (fr.fromLists ? "<div class='tn' style='color:#cbbfe6'>From MyGrad's quarter lists" + (fr.outcome === "left" ? " (MyGrad’s lists rarely show an MA)" : "") + "</div>" : ""), e);
            }
            if(cell){
                var i = parseInt(cell.getAttribute("data-stage"), 10);
                var names = roster().filter(function(s){ return s.cohort === ay && stageOf(s) === i; }).map(function(s){ return s.name; }).sort(function(a, b){ return a.localeCompare(b); });
                var year = currentAY - ay + 1, due = moveOnBy(i), stalled = due !== null && year > due;
                showTip("<div class='th'>" + esc(classLabel(ay) + " · " + STAGE_SHORT[i] + " · " + names.length + (names.length === 1 ? " student" : " students") + (stalled ? " · stalled" : "")) + "</div>"
                    + "<ul>" + names.map(function(n){ return "<li class='tn'>" + esc(n) + "</li>"; }).join("") + "</ul>"
                    + (stalled ? "<div class='tf'>Handbook: move on by the end of year " + due + ". This class is in year " + year + ".</div>" : ""), e);
            } else {
                var s = data.students[parseInt(dot.getAttribute("data-student"), 10)];
                showTip("<div class='th' style='margin:0'>" + esc(s.name + " · " + dot.getAttribute("data-tip")) + "</div>", e);
            }
        });
        document.getElementById("cohorts").addEventListener("mouseleave", hideTip);
        document.getElementById("cohorts").addEventListener("click", hideTip);
        function select(k){
            view.highlight = view.highlight === k ? null : k;
            showStudentsIfHighlighting();
            render();
        }
        document.getElementById("cohorts").addEventListener("click", function(e){
            var tr = e.target.closest("tr[data-cohort]");
            if(!tr) return;
            var cell = e.target.closest("td.sc[data-stage]"), dot = e.target.closest(".sdot[data-student]");
            if(cell) return select("stage:" + tr.getAttribute("data-cohort").slice(7) + ":" + cell.getAttribute("data-stage"));
            if(e.target.closest("td.flagcell")) return select("flagged:" + tr.getAttribute("data-cohort").slice(7));
            if(e.target.closest(".sdot.gone")) return;
            if(dot) return select("student:" + dot.getAttribute("data-student"));
            select(tr.getAttribute("data-cohort"));
        });
        ["roster"].forEach(function(id){
            var table = document.getElementById(id);
            table.addEventListener("click", function(e){ var c = e.target.closest(".conn[data-student]"); if(c) select("student:" + c.getAttribute("data-student")); });
            table.addEventListener("keydown", function(e){ var c = e.target.closest(".conn[data-student]"); if(c && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); select("student:" + c.getAttribute("data-student")); } });
        });
        /* Slider: drag a dot (1 class per step); drag the stretch between the dots to slide it; a click moves the older end
           (the newer end only when the click is newer than both); double-click resets to the classes with current students. */
        var slider = document.getElementById("class-slider"), slide = null, lastPress = { t: 0, x: 0 };
        function sliderIndex(e, last){ var box = slider.getBoundingClientRect(); return last ? Math.max(0, Math.min(last, Math.round((e.clientX - box.left) / box.width * last))) : 0; }
        function setSel(stops, a, b, save){ var r = { from: stops[b], to: stops[a] }; if(save) setRange(r); else { view.range = r; renderCohorts(); } }
        slider.addEventListener("pointerdown", function(e){
            e.preventDefault();
            /* A double-click is two quick presses in one spot (the slider redraws between them, so no dblclick event fires). */
            var quick = e.timeStamp - lastPress.t < 450 && Math.abs(e.clientX - lastPress.x) < 8;
            lastPress = { t: quick ? 0 : e.timeStamp, x: e.clientX };
            if(quick){ slide = null; return setRange(defaultRange()); }
            var s = sliderSel(), t = sliderIndex(e, s.stops.length - 1), dot = e.target.closest(".sl-dot");
            slider.setPointerCapture(e.pointerId);
            if(dot) slide = { mode: s.a === s.b ? "either" : dot.getAttribute("data-end") };
            else if(t >= s.a && t <= s.b) slide = { mode: "span", t0: t, x0: e.clientX, a0: s.a, b0: s.b };
            else if(t > s.b){ slide = { mode: "b" }; setSel(s.stops, s.a, t); }
            else { slide = { mode: "a" }; setSel(s.stops, t, s.b); }
        });
        slider.addEventListener("pointermove", function(e){
            if(!slide) return;
            var s = sliderSel(), last = s.stops.length - 1, t = sliderIndex(e, last);
            if(slide.mode === "either" && t !== s.a) slide.mode = t < s.a ? "a" : "b";
            if(slide.mode === "span" && Math.abs(e.clientX - slide.x0) > 4) slide.mode = "pan";
            if(slide.mode === "a" && Math.min(t, s.b) !== s.a) setSel(s.stops, Math.min(t, s.b), s.b);
            else if(slide.mode === "b" && Math.max(t, s.a) !== s.b) setSel(s.stops, s.a, Math.max(t, s.a));
            else if(slide.mode === "pan"){
                var shift = Math.max(-slide.a0, Math.min(last - slide.b0, t - slide.t0));
                if(slide.a0 + shift !== s.a) setSel(s.stops, slide.a0 + shift, slide.b0 + shift);
            }
        });
        slider.addEventListener("pointerup", function(){
            if(!slide) return;
            var m = slide, s = sliderSel();
            slide = null;
            if(m.mode === "span") return setSel(s.stops, s.a, Math.max(s.a, m.t0), true);
            setRange(view.range);
        });
        slider.addEventListener("keydown", function(e){
            var dot = e.target.closest(".sl-dot"), step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
            if(!dot || !step) return;
            e.preventDefault();
            var s = sliderSel(), end = dot.getAttribute("data-end"), last = s.stops.length - 1;
            if(end === "a") setSel(s.stops, Math.max(0, Math.min(s.b, s.a + step)), s.b, true);
            else setSel(s.stops, s.a, Math.max(s.a, Math.min(last, s.b + step)), true);
            slider.querySelector(".sl-dot[data-end='" + end + "']").focus();
        });
        window.addEventListener("resize", drawSlider);
        var collapsed = {};
        try { collapsed = JSON.parse(localStorage.getItem("grad-monitor-collapsed") || "{}") || {}; } catch(e){}
        function setCollapsed(key, isCollapsed){
            collapsed[key] = isCollapsed;
            document.getElementById("panel-" + key).classList.toggle("collapsed", isCollapsed);
            document.querySelector(".panel-toggle[data-panel='" + key + "']").setAttribute("aria-expanded", String(!isCollapsed));
            try { localStorage.setItem("grad-monitor-collapsed", JSON.stringify(collapsed)); } catch(e){}
        }
        ["classes", "students"].forEach(function(key){ if(collapsed[key]) setCollapsed(key, true); });
        document.querySelectorAll(".panel-toggle").forEach(function(b){
            b.addEventListener("click", function(){ var key = b.getAttribute("data-panel"); setCollapsed(key, !collapsed[key]); });
        });
        function showStudentsIfHighlighting(){ if(view.highlight && collapsed.students) setCollapsed("students", false); }
        function toggleHighlight(card){
            var k = card.getAttribute("data-key");
            view.highlight = view.highlight === k ? null : k;
            showStudentsIfHighlighting();
            render();
        }
        document.getElementById("stats").addEventListener("click", function(e){
            if(e.target.closest(".sm-win")) return setRange({ from: newestAY - 9, to: newestAY });
            var b = e.target.closest("[data-key]");
            if(!b) return;
            toggleHighlight(b);
            document.querySelector("#stats [data-key='" + b.getAttribute("data-key") + "']").focus(); /* the summary was redrawn */
        });
        var settingsBtn = document.getElementById("settings-btn"), settingsBox = document.getElementById("settings");
        function showSettings(open){ settingsBox.hidden = !open; settingsBtn.setAttribute("aria-expanded", String(open)); }
        settingsBtn.addEventListener("click", function(){ showSettings(settingsBox.hidden); });
        document.addEventListener("pointerdown", function(e){ if(!settingsBox.hidden && !e.target.closest("#settings, #settings-btn")) showSettings(false); });
        /* A click on dead space (not a control, card, class row, dot, connector or the chart) clears the highlight, and so does
           Escape. The press is judged at pointerdown, before a click re-renders what was clicked; drags (selecting text) don't count. */
        var press = null, LIVE = "a, button, input, select, textarea, label, .pill, th[data-sort], tr[data-cohort], td.coh[data-cohort], .conn, .sdot, #class-slider, #settings";
        document.addEventListener("pointerdown", function(e){ press = { dead: !e.target.closest(LIVE), x: e.clientX, y: e.clientY }; }, true);
        document.addEventListener("click", function(e){
            var p = press;
            press = null;
            if(!p || !p.dead || !view.highlight || Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y) > 4) return;
            view.highlight = null;
            render();
        });
        document.addEventListener("keydown", function(e){
            if(e.key !== "Escape") return;
            if(!settingsBox.hidden){ showSettings(false); settingsBtn.focus(); }
            else if(view.highlight){ view.highlight = null; render(); }
        });
        ["hl-note"].forEach(function(id){
            document.getElementById(id).addEventListener("click", function(e){ if(e.target.classList.contains("hl-clear")){ e.preventDefault(); view.highlight = null; render(); } });
        });
        document.getElementById("show-seg").addEventListener("click", function(e){ var b = e.target.closest("[data-show]"); if(b){ view.show = b.getAttribute("data-show"); render(); } });
        var groupBox = document.getElementById("group-by-class");
        groupBox.checked = view.groupByClass;
        groupBox.addEventListener("change", function(){
            view.groupByClass = this.checked;
            try { localStorage.setItem("grad-monitor-group-by-class", this.checked ? "1" : "0"); } catch(e){}
            render();
        });
        document.getElementById("program").addEventListener("change", function(){ view.program = this.value; this.classList.toggle("on", this.value !== "all"); render(); });
        document.getElementById("search").addEventListener("input", function(){ view.search = this.value; render(); });
        document.getElementById("roster").addEventListener("click", function(e){
            var g = e.target.closest("td.coh[data-cohort]");
            if(g) return select(g.getAttribute("data-cohort"));
            var th = e.target.closest("th[data-sort]");
            if(!th) return;
            var key = th.getAttribute("data-sort");
            view.dir = view.sort === key ? -view.dir : (key === "flags" || key === "year" ? -1 : 1);
            view.sort = key;
            render();
        });
        render();
    }
})();

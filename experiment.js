/* =========================================================================
   Source Ratings Survey (v3) — jsPsych 7
   Flow:
     1. Consent + instructions (with definitions of the 7 dimensions)
     Part 1. Dimension ratings, one page per source. For public figures
             (celebrity, podcaster, politician, journalist, influencer) there are
             two pages: "your favorite ..." and "... in general".
     Part 2. Trust, BLOCKED BY TOPIC. For each topic:
               a) checklist: which sources would you trust for advice on this topic?
               b) ranking: order ALL sources from most to least trusted
               c) reasons (multi-select), ONE PAGE PER source you chose, with a
                  "same as previous source" button
               d) the same, ONE PAGE PER source you didn't choose (why not)
     Part 3. Change in trust over the past year, per source (Yes -> why)
     Part 4. AI use (Yes -> for what; No -> why not)
     Demographics, save via PHP, end
   ========================================================================= */

// -------------------------------------------------------------------------
// >>>>>>>>>>>>  PUT YOUR PHP RECEIVING ADDRESS HERE  <<<<<<<<<<<<
// -------------------------------------------------------------------------
const SAVE_URL = "PUT_YOUR_PHP_URL_HERE";

// SONA completion link. Copy it from your SONA study page and leave the %SURVEY_CODE% placeholder
// where the participant's SONA ID goes, e.g.
// "https://yourschool.sona-systems.com/webstudy_credit.aspx?experiment_id=123&credit_token=abc&survey_code=%SURVEY_CODE%"
const SONA_CREDIT_URL = "PUT_YOUR_SONA_CREDIT_URL_HERE";

// -------------------------------------------------------------------------
// Stimuli
// -------------------------------------------------------------------------
const FIXED_SOURCES = [
  "A doctor", "A lawyer", "A therapist", "A professor or teacher",
  "A parent", "A friend", "A spouse or partner",
  "An online forum (e.g., Reddit)",
  "Social media posts (e.g., TikTok / Instagram post)",
  "An AI chatbot (e.g., ChatGPT, Claude, Gemini)",
  "A search engine",
];

// Public figures are rated twice in Part 1 (favorite / in general), because trust can differ a lot
// between one you like and one you are opposed to.
const PUBLIC_FIGURES = [
  { key: "celebrity",  favorite: "Your favorite celebrity (e.g., an actor, musician, athlete)", general: "Celebrities in general" },
  { key: "podcaster",  favorite: "Your favorite podcaster",  general: "Podcasters in general" },
  { key: "politician", favorite: "Your favorite politician", general: "Politicians in general" },
  { key: "journalist", favorite: "Your favorite journalist", general: "Journalists in general" },
  { key: "influencer", favorite: "Your favorite influencer", general: "Influencers in general" },
];

// Plural "in general" wording of every source, used for the past-year change-in-trust questions (Part 3).
// Same order as FIXED_SOURCES, then the public figures' general labels.
const FIXED_GENERAL = [
  "Medical doctors in general", "Lawyers in general", "Therapists in general", "Professors or teachers in general",
  "Parents in general", "Friends in general", "Spouses or partners in general",
  "Online forums (e.g., Reddit) in general",
  "Social media posts (e.g., TikTok / Instagram post) in general",
  "AI chatbots (e.g., ChatGPT, Claude, Gemini) in general",
  "Search engines in general",
];
const CHANGE_SOURCES_ALL = [...FIXED_GENERAL, ...PUBLIC_FIGURES.map((p) => p.general)];

// Which version of the public figures is used in Parts 2 and 3 ("general" or "favorite").
const PART2_VARIANT = "general";

const GENERAL_NOTE = "Think about this group overall, not only the ones you like or are opposed to.";

// `label` is shown in the sentence "advice on ___"; `gloss` is shown on the topic intro page.
// `core` marks the 4 key topics. Set USE_CORE_TOPICS_ONLY = false to use all 6.
const ALL_TOPICS = [
  { key: "health",        core: true,  label: "personal health", gloss: "e.g., symptoms, medication, diet, whether to see a doctor" },
  { key: "relationships", core: true,  label: "relationships", gloss: "e.g., dating, friendships, family conflict, whether to end a relationship" },
  { key: "voting",        core: true,  label: "voting",        gloss: "e.g., which candidate, party or ballot measure to support" },
  { key: "purchasing",    core: true,  label: "purchasing",    gloss: "e.g., what to buy, which product or brand, whether it is worth the price" },
  { key: "school_work",   core: false, label: "school or work tasks", gloss: "e.g., how to approach an assignment, a project, or a problem at work" },
  { key: "legal",         core: false, label: "legal matters", gloss: "e.g., contracts, disputes, your rights, whether to take legal action" },
];
const USE_CORE_TOPICS_ONLY = true;
const TOPICS = ALL_TOPICS.filter((t) => t.core || !USE_CORE_TOPICS_ONLY);

// `key` becomes the column name; `name` + `definition` are shown to participants.
// `q` is the question asked in Part 1. `yes` / `no` are the options in the Part 2 "reasons" lists.
const DIMENSIONS = [
  { key: "expertise", name: "Expertise",
    definition: "How much knowledge or expertise this source has.",
    q: "In general, how much <b>expertise</b> does this source have?",
    yes: "They have expertise / knowledge", no: "They lack expertise / knowledge" },
  { key: "accountability", name: "Accountability",
    definition: "How able you are to hold this source accountable for the advice they give you.",
    q: "How able are you to hold this source <b>accountable</b> for the advice they give you?",
    yes: "I can hold them accountable for their advice", no: "I can't hold them accountable for their advice" },
  { key: "benevolence", name: "Benevolence",
    definition: "How much this source genuinely cares about your well-being and wants what is best for you.",
    q: "How <b>benevolent</b> is this source?",
    context: "That is, how much they genuinely care about your well-being and want what is best for you.",
    yes: "They care about my well-being", no: "They don't care about my well-being" },
  { key: "independence", name: "Independence",
    definition: "How free this source is from conflicting interests in giving you advice (i.e., they have nothing to gain from what they tell you).",
    q: "How <b>independent</b> is this source? That is, how free are they from conflicting interests when advising you?",
    context: "For example, they have nothing to gain from what they tell you.",
    yes: "They have no conflicting interests", no: "They may have conflicting interests" },
  { key: "closeness", name: "Emotional closeness",
    definition: "How emotionally close you feel to this source.",
    q: "How <b>emotionally close</b> do you feel to this source?",
    yes: "I feel emotionally close to them", no: "I don't feel emotionally close to them" },
  { key: "availability", name: "Availability",
    definition: "How available this source is to give you advice when you need it.",
    q: "How <b>available</b> is this source to give you advice when you need it?",
    context: "For example, can you reach out to them, or search for their previously published advice or opinions online, when you need it?",
    yes: "They are available when I need them", no: "They are not available when I need them" },
  { key: "judgment", name: "Judgment",
    definition: "How likely this source is to judge you for the issues you seek their advice on.",
    q: "How likely is this source to <b>judge</b> you for the issues you seek their advice on?",
    yes: "They don't judge me", no: "They would judge me" },
];

const LIKERT_LABELS = [
  "1<br>Not at all", "2", "3", "4<br>Moderately", "5", "6", "7<br>Extremely",
];

const NUM_ATTENTION_CHECKS = 2;          // Part 1 pages that get an attention-check question (0 = none)
const ATTENTION_CHECK_ANSWER = 5;        // the number participants are told to select

const RANDOMIZE_SOURCE_ORDER = true;     // order of sources in Part 1 and Part 3
const RANDOMIZE_TOPIC_ORDER = true;      // order of the topic blocks
const RANDOMIZE_DIMENSION_ORDER = true;  // question order within each Part 1 page
const RANDOMIZE_CHECKLIST_ORDER = true;  // order of sources in the Part 2 checklist and starting order of the ranking

// -------------------------------------------------------------------------
// Setup
// -------------------------------------------------------------------------
const jsPsych = initJsPsych();

// Every participant gets a fresh random 8-digit ID. THIS is the only ID that appears in the data files.
// The SONA ID (from the URL, as ?id=... or ?sona_id=...) is kept in memory only, and is used
// solely to send participants back to SONA so they receive credit. It is never saved.
const randomId8 = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(10000000 + (buf[0] % 90000000));
};
const participantId = randomId8();
const sonaId = jsPsych.data.getURLVariable("sona_id") || jsPsych.data.getURLVariable("id") || "";

jsPsych.data.addProperties({ participant_id: participantId });

const maybeShuffle = (arr, flag) => (flag ? jsPsych.randomization.shuffle(arr) : arr.slice());

// Part 1 items: {label, note, variant}
let PART1_ITEMS = [
  ...FIXED_SOURCES.map((label) => ({ label, note: "", variant: "" })),
  ...PUBLIC_FIGURES.flatMap((p) => [
    { label: p.favorite, note: "", variant: "favorite", group: p.key },
    { label: p.general, note: GENERAL_NOTE, variant: "general", group: p.key },
  ]),
];
// Sources used in Parts 2 and 3
let SOURCES = [...FIXED_SOURCES, ...PUBLIC_FIGURES.map((p) => p[PART2_VARIANT])];

// Test mode: open the survey with ?workerId=ivette_test (or ?id=ivette_test) for a short run through every question type.
// Part 1: the first source plus the podcaster pair. Parts 2-3: 3 sources (a ranking needs more than one).
const TEST_MODE = [jsPsych.data.getURLVariable("workerId"), jsPsych.data.getURLVariable("id"),
                   jsPsych.data.getURLVariable("sona_id")].includes("ivette_test");
if (TEST_MODE) {
  PART1_ITEMS = PART1_ITEMS.filter((i, idx) => idx === 0 || i.group === "podcaster");
  SOURCES = SOURCES.slice(0, 3);
}

// Part 3 sources (in general wording); in test mode, the same number as Parts 2-3
const CHANGE_SOURCES = CHANGE_SOURCES_ALL.slice(0, SOURCES.length);

// Reusable yes/no page. Calls onAnswer(true|false) so later pages can branch.
function yesNoTrial({ task, stimulus, data, onAnswer }) {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus,
    choices: ["Yes", "No"],
    data: { task, ...data },
    on_finish: (d) => {
      d.answer = d.response === 0 ? "yes" : "no";
      onAnswer(d.response === 0);
    },
  };
}

function openTextTrial({ task, prompt, data, conditional }) {
  // conditional_function only works on a timeline node, so wrap the trial
  return {
    timeline: [{
      type: jsPsychSurveyText,
      questions: [{ prompt, name: "text", rows: 5, columns: 60, required: true }],
      button_label: "Continue",
      data: { task, ...data },
      on_finish: (d) => { d.text = d.response.text; },
    }],
    conditional_function: conditional,
  };
}

// Display-only emphasis on the key qualifier ("Your favorite" / "in general"); data keep the plain label.
const fmt = (label) => label
  .replace(/^Your favorite/, "<u><b>Your favorite</b></u>")
  .replace(/ in general$/, " <u><b>in general</b></u>");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const listHtml = (arr) => `<ul class="defs">${arr.map((s) => `<li>${fmt(s)}</li>`).join("")}</ul>`;

const timeline = [];

// -------------------------------------------------------------------------
// Consent / instructions
// -------------------------------------------------------------------------
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <h2>Welcome</h2>
    <p>[Consent text goes here.]</p>`,
  choices: ["I agree"],
  data: { task: "consent" },
});

const definitionsHtml = `
  <ul class="defs">
    ${DIMENSIONS.map((d) => `<li><b>${d.name}</b>: ${d.definition}</li>`).join("")}
  </ul>`;

timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <h2>Instructions</h2>
    <p>In this survey you will think about people and sources you might go to for advice.</p>
    <p>First, you will rate each source on ${DIMENSIONS.length} dimensions (1 = Not at all, 7 = Extremely).
       Here is what each dimension means:</p>
    ${definitionsHtml}
    <p>Afterwards, you will tell us which sources you would trust for advice on
       ${TOPICS.length} different topics, and rank them.</p>`,
  choices: ["Start"],
  data: { task: "instructions" },
});

// -------------------------------------------------------------------------
// Part 1 — Dimension ratings: one page per source (public figures twice)
// -------------------------------------------------------------------------
const part1Order = maybeShuffle(PART1_ITEMS, RANDOMIZE_SOURCE_ORDER);

// Attention checks: an extra instructed-response question on a few randomly chosen pages.
// Never on "favorite" pages, because those can be greyed out.
const attentionItems = new Set(
  jsPsych.randomization.shuffle(part1Order.filter((i) => i.variant !== "favorite"))
    .slice(0, NUM_ATTENTION_CHECKS)
);

part1Order.forEach((item) => {
  let noFavorite = false;  // set by the "I don't have a favorite ..." box
  const hasCheck = attentionItems.has(item);
  timeline.push({
    type: jsPsychSurveyLikert,
    preamble: `<p>Please rate the following source:</p>
               <div class="source-name">${fmt(item.label)}</div>
               ${item.note ? `<p class="dim-def">${item.note}</p>` : ""}
    ${item.variant === "favorite" ? `
      <label class="no-fav-box">
        <input type="checkbox" id="no-favorite"> I don't have a favorite ${item.group}
      </label>` : ""}`,
    questions: DIMENSIONS.map((d) => ({
      prompt: d.context ? `${d.q}<br><span class="dim-def">${d.context}</span>` : d.q,
      name: d.key,
      labels: LIKERT_LABELS,
      required: true,
    })).concat(hasCheck ? [{
      prompt: `To show you are reading carefully, please select ${ATTENTION_CHECK_ANSWER} for this question.`,
      name: "attn_check",
      labels: LIKERT_LABELS,
      required: true,
    }] : []),
    randomize_question_order: RANDOMIZE_DIMENSION_ORDER,
    button_label: "Continue",
    data: { task: "rating", source: item.label, variant: item.variant },
    on_load: () => {
      const box = document.getElementById("no-favorite");
      if (!box) return;
      const form = document.getElementById("jspsych-survey-likert-form");
      const radios = form.querySelectorAll("input[type=radio]");
      // Remember which radios were required, so unticking the box restores validation.
      radios.forEach((r) => { r.dataset.wasRequired = r.required ? "1" : ""; });
      box.addEventListener("change", () => {
        noFavorite = box.checked;
        form.querySelectorAll(".jspsych-survey-likert-statement, .jspsych-survey-likert-opts")
          .forEach((el) => el.classList.toggle("greyed-out", box.checked));
        radios.forEach((r) => {
          if (box.checked) r.checked = false;
          r.disabled = box.checked;
          r.required = !box.checked && !!r.dataset.wasRequired;
        });
      });
    },
    on_finish: (data) => {
      const none = noFavorite;
      data.no_favorite = none;
      for (const d of DIMENSIONS) data[d.key] = none ? "NA" : data.response[d.key] + 1;
      if (hasCheck) {
        data.attn_check_response = data.response.attn_check + 1;
        data.attn_check_passed = data.attn_check_response === ATTENTION_CHECK_ANSWER;
      }
    },
  });

  // Follow-up for "favorite" pages: who is it? (skipped if they have no favorite)
  if (item.variant === "favorite") {
    let preferNot = false;
    timeline.push({
      timeline: [{
        type: jsPsychSurveyHtmlForm,
        preamble: `<p>Who is your favorite <b>${item.group}</b>?</p>`,
        html: `
          <p><input type="text" name="fav_name" id="fav-name" size="40" required></p>
          <label><input type="checkbox" id="fav-prefer-not"> I prefer not to answer</label>`,
        button_label: "Continue",
        data: { task: "favorite_name", source: item.label },
        on_load: () => {
          const txt = document.getElementById("fav-name");
          const box = document.getElementById("fav-prefer-not");
          box.addEventListener("change", () => {
            preferNot = box.checked;
            if (box.checked) txt.value = "";
            txt.disabled = box.checked;
            txt.required = !box.checked;
          });
        },
        on_finish: (data) => {
          data.prefer_not_to_answer = preferNot;
          data.favorite_name = preferNot ? "" : (data.response.fav_name || "").trim();
        },
      }],
      conditional_function: () => !noFavorite,
    });
  }
});

// -------------------------------------------------------------------------
// Part 2 — Trust by topic (blocked by topic)
// -------------------------------------------------------------------------
const whoForTopic = (topic) => `
  <div class="who-for">
    <div><b>For:</b> advice on ${topic.label}</div>
  </div>`;

// Checkboxes: which sources would you trust for this topic?
function checklistTrial(topic, state, sources, withCheck = false) {
  // Attention check: an extra option, inserted at a random position, that must be the ONLY one ticked.
  const options = sources.map((s, i) => ({ name: `src_${i}`, value: esc(s), text: fmt(s) }));
  if (withCheck) {
    options.splice(Math.floor(Math.random() * (options.length + 1)), 0, {
      name: "attn_check", value: "attn_check",
      text: "<b>Attention check:</b> to show you are reading carefully, select only this option and no others",
    });
  }
  return {
    type: jsPsychSurveyHtmlForm,
    preamble: `${whoForTopic(topic)}
      <p>Which of these sources would you <b>trust</b> for advice on <b>${topic.label}</b>?<br>
         Select all that apply. Leave a source unchecked if you would not trust it for this.</p>`,
    html: `<div class="check-list">${options
      .map((o) => `<label><input type="checkbox" name="${o.name}" value="${o.value}"> ${o.text}</label>`)
      .join("")}</div>`,
    button_label: "Continue",
    data: { task: "topic_checklist", topic: topic.key, topic_label: topic.label },
    on_finish: (d) => {
      const chosen = Object.values(d.response);
      if (withCheck) d.attn_check_passed = chosen.length === 1 && chosen[0] === "attn_check";
      state.trusted = sources.filter((s) => chosen.includes(s));
      state.untrusted = sources.filter((s) => !chosen.includes(s));
      state.idx = { trust: 0, distrust: 0 }; state.last = { trust: null, distrust: null };   // reset the per-source reasons loops
      d.trusted = state.trusted.join("|");
      d.untrusted = state.untrusted.join("|");
      d.n_trusted = state.trusted.length;
    },
  };
}

// Ranking: drag items (or use the arrows) to order ALL sources, most trusted at the top.
function rankingTrial(topic, sources) {
  const start = maybeShuffle(sources, RANDOMIZE_CHECKLIST_ORDER);
  return {
    type: jsPsychSurveyHtmlForm,
    preamble: `${whoForTopic(topic)}
      <p>Now <b>rank all of these sources</b> from the one you trust <b>most</b> (top) to the one you trust
         <b>least</b> (bottom) for advice on <b>${topic.label}</b>.<br>
         Drag items, or use the arrows.</p>
      <div class="rank-end">&#9650; Most trusted</div>`,
    html: `
      <ol class="rank-list" id="rank-list">${start
        .map((s) => `<li draggable="true" data-label="${esc(s)}"><span class="lbl">${fmt(s)}</span>
          <button type="button" class="up" aria-label="Move up">&#9650;</button>
          <button type="button" class="down" aria-label="Move down">&#9660;</button></li>`)
        .join("")}</ol>
      <div class="rank-end">&#9660; Least trusted</div>
      <input type="hidden" name="ranking" id="rank-input">
      <input type="hidden" name="moves" id="rank-moves" value="0">`,
    button_label: "Continue",
    data: { task: "topic_ranking", topic: topic.key, topic_label: topic.label },
    on_load: () => {
      const list = document.getElementById("rank-list");
      const input = document.getElementById("rank-input");
      const movesInput = document.getElementById("rank-moves");
      let moves = 0;
      const sync = (moved) => {
        if (moved) movesInput.value = ++moves;
        input.value = [...list.children].map((li) => li.dataset.label).join("|");
      };
      sync(false);
      list.addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li) return;
        if (e.target.classList.contains("up") && li.previousElementSibling) {
          list.insertBefore(li, li.previousElementSibling); sync(true);
        } else if (e.target.classList.contains("down") && li.nextElementSibling) {
          list.insertBefore(li.nextElementSibling, li); sync(true);
        }
      });
      let dragging = null;
      list.addEventListener("dragstart", (e) => {
        dragging = e.target.closest("li");
        if (dragging) { dragging.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; }
      });
      list.addEventListener("dragover", (e) => {
        e.preventDefault();
        const over = e.target.closest("li");
        if (!dragging || !over || over === dragging) return;
        const r = over.getBoundingClientRect();
        list.insertBefore(dragging, e.clientY < r.top + r.height / 2 ? over : over.nextSibling);
      });
      list.addEventListener("dragend", () => {
        if (dragging) dragging.classList.remove("dragging");
        dragging = null; sync(true);
      });
    },
    on_finish: (d) => {
      d.ranking = d.response.ranking;       // most trusted first
      d.moves = Number(d.response.moves);   // 0 = the starting order was never touched
    },
  };
}

const reasonBoxes = (kind) => `<div class="check-list">
  ${DIMENSIONS.map((d) =>
    `<label><input type="checkbox" name="${d.key}" value="1"> ${d[kind]}</label>`).join("")}
  <label><input type="checkbox" name="other" value="1"> Other:
    <input type="text" name="other_text" style="width:60%"></label>
</div>`;

const readReasons = (d) => {
  const r = d.response;
  d.reasons = DIMENSIONS.filter((x) => r[x.key]).map((x) => x.key).concat(r.other ? ["other"] : []).join("|");
  d.other_text = r.other_text || "";
};

// Reasons: one page per source, for both the sources the participant trusts (kind "trust") and the
// ones they don't (kind "distrust"), with a "same reasons as the previous source" button that copies
// the last answers. Distrust pages also require at least one reason.
function reasonsLoop(topic, state, kind) {
  const trust = kind === "trust";
  const list = () => (trust ? state.trusted : state.untrusted);
  const current = () => list()[state.idx[kind]];
  let usedSame = false;
  return {
    timeline: [{
      timeline: [{
        type: jsPsychSurveyHtmlForm,
        preamble: () => `<div class="who-for">
            <div><b>Who:</b> ${fmt(current())}</div>
            <div><b>For:</b> advice on ${topic.label}</div>
          </div>
          <p>Which of the following contribute to why you ${trust ? "<b>trust</b>" : "do <u>not</u> trust"} this source for advice on
             <b>${topic.label}</b>? Select all that apply.</p>
          <p class="rank-end">Source ${state.idx[kind] + 1} of ${list().length} that you ${trust ? "selected" : "did not select"}</p>`,
        html: () => `${state.last[kind] ? `<button type="button" id="same-btn">Same reasons as the previous source (${state.last[kind].source})</button>` : ""}
          ${reasonBoxes(trust ? "yes" : "no")}
          ${trust ? "" : `<p id="reason-error" style="color:#b00020; display:none">
            Please select at least one reason (if you choose "Other", please describe it).</p>`}`,
        button_label: "Continue",
        data: () => ({ task: `topic_reasons_${kind}`, topic: topic.key, topic_label: topic.label, source: current() }),
        on_load: () => {
          usedSame = false;
          const btn = document.getElementById("same-btn");
          if (btn) {
            btn.addEventListener("click", () => {
              usedSame = true;
              const last = state.last[kind];
              DIMENSIONS.forEach((d) => {
                document.querySelector(`input[name="${d.key}"]`).checked = last.keys.includes(d.key);
              });
              document.querySelector('input[name="other"]').checked = last.keys.includes("other");
              document.querySelector('input[name="other_text"]').value = last.other_text;
            });
          }
          if (trust) return;
          // Require at least one reason before the participant can continue
          document.getElementById("jspsych-survey-html-form-next").addEventListener("click", (e) => {
            const boxes = [...document.querySelectorAll('.check-list input[type="checkbox"]')];
            const other = document.querySelector('input[name="other"]');
            const otherText = document.querySelector('input[name="other_text"]').value.trim();
            const ok = boxes.some((b) => b.checked) && !(other.checked && !otherText);
            if (!ok) {
              e.preventDefault();
              e.stopImmediatePropagation();
              document.getElementById("reason-error").style.display = "block";
            }
          }, true);
        },
        on_finish: (d) => {
          readReasons(d);
          d.same_as_previous_clicked = usedSame;
          state.last[kind] = { source: d.source, keys: d.reasons ? d.reasons.split("|") : [], other_text: d.other_text };
          state.idx[kind]++;
        },
      }],
      loop_function: () => state.idx[kind] < list().length,
    }],
    conditional_function: () => list().length > 0,
  };
}

// One randomly chosen topic block gets an attention check in its checklist (-1 = none)
const attentionTopicIdx = NUM_ATTENTION_CHECKS > 0 ? Math.floor(Math.random() * TOPICS.length) : -1;

maybeShuffle(TOPICS, RANDOMIZE_TOPIC_ORDER).forEach((topic, i) => {
  const state = { trusted: [], untrusted: [], idx: { trust: 0, distrust: 0 }, last: { trust: null, distrust: null } };
  const sources = maybeShuffle(SOURCES, RANDOMIZE_CHECKLIST_ORDER);

  timeline.push(
    {
      type: jsPsychHtmlButtonResponse,
      stimulus: `
        <h2>Topic ${i + 1} of ${TOPICS.length}</h2>
        <p>In this section, think about getting advice on:</p>
        <div class="source-name">${topic.label}</div>
        <p>(${topic.gloss})</p>
        <p>You will choose which sources you would trust for this, rank them, and tell us why.</p>`,
      choices: ["Continue"],
      data: { task: "topic_intro", topic: topic.key },
    },
    checklistTrial(topic, state, sources, i === attentionTopicIdx),
    rankingTrial(topic, sources),
    reasonsLoop(topic, state, "trust"),
    reasonsLoop(topic, state, "distrust")
  );
});

// -------------------------------------------------------------------------
// Part 3 — Has trust in each source notably changed in the past year?
// -------------------------------------------------------------------------
maybeShuffle(CHANGE_SOURCES, RANDOMIZE_SOURCE_ORDER).forEach((source) => {
  let changed = false;
  timeline.push(
    yesNoTrial({
      task: "trust_change_yesno",
      stimulus: `<p>Has your overall trust in</p><div class="source-name">${fmt(source)}</div>
                 <p>changed notably in the past year?</p>`,
      data: { source },
      onAnswer: (v) => { changed = v; },
    }),
    openTextTrial({
      task: "trust_change_why",
      prompt: `<b>${fmt(source)}</b><br><br>How has your trust changed, and why?`,
      data: { source },
      conditional: () => changed,
    })
  );
});

// -------------------------------------------------------------------------
// Part 4 — AI use
// -------------------------------------------------------------------------
let usesAI = false;
timeline.push(
  yesNoTrial({
    task: "ai_use_yesno",
    stimulus: `<p>Do you use AI (e.g., chatbots such as ChatGPT or Claude) to seek advice or information?</p>`,
    data: {},
    onAnswer: (v) => { usesAI = v; },
  }),
  openTextTrial({
    task: "ai_use_for_what",
    prompt: "What do you use AI for?",
    data: {},
    conditional: () => usesAI,
  }),
  openTextTrial({
    task: "ai_use_why_not",
    prompt: "Why do you not use AI?",
    data: {},
    conditional: () => !usesAI,
  })
);

// -------------------------------------------------------------------------
// Demographics — edit fields as needed
// -------------------------------------------------------------------------
timeline.push({
  type: jsPsychSurveyHtmlForm,
  preamble: "<h2>A few questions about you</h2>",
  html: `
    <div class="demo-form">
      <label>Age:
        <input name="age" type="number" min="18" max="120" required>
      </label>

      <label>Gender:
        <select name="gender" required>
          <option value="" disabled selected>Select...</option>
          <option value="woman">Woman</option>
          <option value="man">Man</option>
          <option value="nonbinary">Non-binary</option>
          <option value="self_describe">Prefer to self-describe</option>
          <option value="no_answer">Prefer not to say</option>
        </select>
      </label>
      <label id="gender-other-label" style="display:none">Please describe your gender:
        <input name="gender_self_describe" id="gender-other" type="text">
      </label>

      <label>Highest level of education completed:
        <select name="education" required>
          <option value="" disabled selected>Select...</option>
          <option value="high_school">High school or less</option>
          <option value="college">College / some university</option>
          <option value="bachelors">Bachelor's degree</option>
          <option value="graduate">Graduate degree</option>
          <option value="no_answer">Prefer not to say</option>
        </select>
      </label>

      <label>Country of residence:
        <input name="country" type="text">
      </label>
    </div>`,
  button_label: "Continue",
  on_load: () => {
    const sel = document.querySelector('select[name="gender"]');
    const box = document.getElementById("gender-other");
    const lab = document.getElementById("gender-other-label");
    sel.addEventListener("change", () => {
      const show = sel.value === "self_describe";
      lab.style.display = show ? "block" : "none";
      box.required = show;
      if (!show) box.value = "";
    });
  },
  data: { task: "demographics" },
  on_finish: (data) => { Object.assign(data, data.response); },
});

// -------------------------------------------------------------------------
// Save data via PHP (waits for the server before moving on)
// -------------------------------------------------------------------------
const SAVED_TASKS = [
  "rating", "topic_checklist", "topic_ranking",
  "topic_reasons_trust", "topic_reasons_distrust",
  "trust_change_yesno", "trust_change_why",
  "ai_use_yesno", "ai_use_for_what", "ai_use_why_not", "demographics",
];

timeline.push({
  type: jsPsychCallFunction,
  async: true,
  func: (done) => {
    jsPsych.getDisplayElement().innerHTML =
      "<p>Saving your responses, please wait...</p>";

    const csv = jsPsych.data
      .get()
      .filterCustom((t) => SAVED_TASKS.includes(t.task))
      .ignore(["response", "stimulus"])
      .csv();

    fetch(SAVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: `${participantId}_${Date.now()}.csv`,
        filedata: csv,
      }),
    })
      .then((res) => done({ save_status: res.ok ? "ok" : `http_${res.status}` }))
      .catch((err) => {
        console.error("Save failed:", err);
        done({ save_status: "error" });
      });
  },
});

// -------------------------------------------------------------------------
// End
// -------------------------------------------------------------------------
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <h2>Thank you!</h2>
    <p>Your responses have been recorded.</p>
    <p>Click below to return to SONA and receive your credit.</p>`,
  choices: ["Get my credit"],
  on_finish: () => {
    // Redirect to SONA with the participant's SONA ID (not stored in the data)
    window.location.href = SONA_CREDIT_URL.replace("%SURVEY_CODE%", encodeURIComponent(sonaId));
  },
});

jsPsych.run(timeline);

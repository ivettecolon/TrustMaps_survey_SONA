/* =========================================================================
   Source Ratings Survey (v2) — jsPsych 7
   Flow:
     1. Consent + instructions (with definitions of the 7 dimensions)
     2. Dimension ratings: one page per source, 7 Likert items
     3. Trust trials, BLOCKED BY TOPIC: for each topic, for each source:
          "Do you trust [source] for advice on [topic]?"
            Always -> next page: how much? (Likert)
            No     -> then another page: why not? (open text)
     4. Change in trust over the past year, per source (Yes -> why, open text)
     5. AI use (Yes -> for what; No -> why not)
     6. Demographics, save via PHP, end
   ========================================================================= */

// -------------------------------------------------------------------------
// >>>>>>>>>>>>  PUT YOUR PHP RECEIVING ADDRESS HERE  <<<<<<<<<<<<
// -------------------------------------------------------------------------
const SAVE_URL = "PUT_YOUR_PHP_URL_HERE";

// -------------------------------------------------------------------------
// Stimuli — replace with your real sources and topics
// -------------------------------------------------------------------------
const ALL_SOURCES = [
  "A doctor",
  "A lawyer",
  "A therapist",
  "A professor or teacher",
  "A parent",
  "A friend",
  "A spouse or partner",
  "A favorite celebrity (e.g., an actor, musician, athlete)",
  "A podcaster",
  "A politician",
  "A journalist",
  "An influencer",
  "An online forum (e.g., Reddit)",
  "Social media posts (e.g., TikTok / Instagram post)",
  "An AI chatbot (e.g., ChatGPT, Claude, Gemini)",
  "A search engine",
];

// `label` is shown in the sentence "advice on ___"; `gloss` is shown on the topic intro page.
const TOPICS = [
  { key: "health",        label: "health",        gloss: "e.g., symptoms, medication, diet, whether to see a doctor" },
  { key: "relationships", label: "relationships", gloss: "e.g., dating, friendships, family conflict, whether to end a relationship" },
  { key: "voting",        label: "voting",        gloss: "e.g., which candidate, party or ballot measure to support" },
  { key: "purchasing",    label: "purchasing",    gloss: "e.g., what to buy, which product or brand, whether it is worth the price" },
  { key: "school_work",   label: "school or work tasks", gloss: "e.g., how to approach an assignment, a project, or a problem at work" },
  { key: "legal",         label: "legal matters", gloss: "e.g., contracts, disputes, your rights, whether to take legal action" },
];

// `key` becomes the column name; `name` + `definition` are shown to participants.
const DIMENSIONS = [
  { key: "expertise", name: "Expertise",
    definition: "How much knowledge or expertise this source has on the topic." },
  { key: "accountability", name: "Accountability",
    definition: "How able you are to hold this source accountable for the advice they give you." },
  { key: "benevolence", name: "Benevolence",
    definition: "How much this source genuinely cares about your well-being and wants what is best for you." },
  { key: "independence", name: "Independence",
    definition: "How free this source is from conflicting interests in giving you advice (i.e., they have nothing to gain from what they tell you)." },
  { key: "closeness", name: "Emotional closeness",
    definition: "How emotionally close you feel to this source." },
  { key: "availability", name: "Availability",
    definition: "How available this source is to give you advice when you need it." },
  { key: "judgment", name: "Judgment",
    definition: "How likely this source is to judge you for the issues you seek their advice on." },
];

const LIKERT_LABELS = [
  "1<br>Not at all", "2", "3", "4<br>Moderately", "5", "6", "7<br>Extremely",
];
const TRUST_LABELS = [
  "1<br>Very little", "2", "3", "4<br>Moderately", "5", "6", "7<br>Completely",
];

const RANDOMIZE_SOURCE_ORDER = true;     // source order on rating pages, and within each topic block
const RANDOMIZE_TOPIC_ORDER = true;      // order of the topic blocks
const RANDOMIZE_DIMENSION_ORDER = true;  // question order within each rating page

// -------------------------------------------------------------------------
// Setup
// -------------------------------------------------------------------------
const jsPsych = initJsPsych();

const participantId =
  jsPsych.data.getURLVariable("PROLIFIC_PID") ||
  jsPsych.data.getURLVariable("workerId") ||
  jsPsych.data.getURLVariable("id") ||
  jsPsych.randomization.randomID(10);

jsPsych.data.addProperties({ participant_id: participantId });

// Test mode: open the survey with ?workerId=ivette_test to run every question
// type with just ONE source (all topics are still included).
const TEST_MODE = participantId === "ivette_test";
const SOURCES = TEST_MODE ? ALL_SOURCES.slice(0, 1) : ALL_SOURCES;

const maybeShuffle = (arr, flag) => (flag ? jsPsych.randomization.shuffle(arr) : arr.slice());

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

// "Who / For" header shown on the trust pages
const whoFor = (source, topic) => `
  <div class="who-for">
    <div><b>Who:</b> ${source}</div>
    <div><b>For:</b> advice on ${topic.label}</div>
  </div>`;

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
    <p>In this survey you will think about ${SOURCES.length} people or sources you might go to for advice.</p>
    <p>First, you will rate each source on ${DIMENSIONS.length} dimensions (1 = Not at all, 7 = Extremely).
       Here is what each dimension means:</p>
    ${definitionsHtml}
    <p>Afterwards, you will answer some questions about how much you trust each source
       for advice on different topics.</p>`,
  choices: ["Start"],
  data: { task: "instructions" },
});

// -------------------------------------------------------------------------
// Part 1 — Dimension ratings: one page per source, 7 Likert items
// -------------------------------------------------------------------------
const ratingTrials = maybeShuffle(SOURCES, RANDOMIZE_SOURCE_ORDER).map((source) => ({
  type: jsPsychSurveyLikert,
  preamble: `<p>Please rate the following source:</p>
             <div class="source-name">${source}</div>`,
  questions: DIMENSIONS.map((d) => ({
    prompt: `How much <b>${d.name}</b> does this source have?<br><span class="dim-def">${d.definition}</span>`,
    name: d.key,
    labels: LIKERT_LABELS,
    required: true,
  })),
  randomize_question_order: RANDOMIZE_DIMENSION_ORDER,
  button_label: "Continue",
  data: { task: "rating", source },
  on_finish: (data) => {
    // Likert responses are 0-indexed; store 1–7 as separate columns
    for (const d of DIMENSIONS) data[d.key] = data.response[d.key] + 1;
  },
}));
timeline.push(...ratingTrials);

// -------------------------------------------------------------------------
// Part 2 — Trust by topic (blocked by topic)
// Each trial: yes/no -> Likert page (always) -> open-text "why not" page (only if No)
// -------------------------------------------------------------------------
maybeShuffle(TOPICS, RANDOMIZE_TOPIC_ORDER).forEach((topic, i) => {
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <h2>Topic ${i + 1} of ${TOPICS.length}</h2>
      <p>In this section, think about getting advice on:</p>
      <div class="source-name">${topic.label}</div>
      <p>(${topic.gloss})</p>
      <p>You will be asked about each of the ${SOURCES.length} sources in turn.</p>`,
    choices: ["Continue"],
    data: { task: "topic_intro", topic: topic.key },
  });

  maybeShuffle(SOURCES, RANDOMIZE_SOURCE_ORDER).forEach((source) => {
    const meta = { topic: topic.key, topic_label: topic.label, source };
    let trusts = false; // set by the yes/no page, read by the follow-ups

    timeline.push(
      yesNoTrial({
        task: "trust_yesno",
        stimulus: `${whoFor(source, topic)}
                   <p>Do you trust this source for this advice?</p>`,
        data: meta,
        onAnswer: (v) => { trusts = v; },
      }),
      {
        type: jsPsychSurveyLikert,
        preamble: whoFor(source, topic),
        questions: [{
          prompt: "How much do you trust this source for this advice?",
          name: "trust_level",
          labels: TRUST_LABELS,
          required: true,
        }],
        button_label: "Continue",
        data: { task: "trust_level", ...meta },
        on_finish: (d) => { d.trust_level = d.response.trust_level + 1; },
      },
      openTextTrial({
        task: "trust_why_not",
        prompt: `${whoFor(source, topic)}<br>
                 Why do you <u>not</u> trust this source for this advice?`,
        data: meta,
        conditional: () => !trusts,
      })
    );
  });
});

// -------------------------------------------------------------------------
// Part 3 — Has trust in each source notably changed in the past year?
// -------------------------------------------------------------------------
maybeShuffle(SOURCES, RANDOMIZE_SOURCE_ORDER).forEach((source) => {
  let changed = false;
  timeline.push(
    yesNoTrial({
      task: "trust_change_yesno",
      stimulus: `<p>Has your overall trust in</p><div class="source-name">${source}</div>
                 <p>changed notably in the past year?</p>`,
      data: { source },
      onAnswer: (v) => { changed = v; },
    }),
    openTextTrial({
      task: "trust_change_why",
      prompt: `<b>${source}</b><br><br>How has your trust changed, and why?`,
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
  "rating", "trust_yesno", "trust_level", "trust_why_not",
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
    <p>[Completion code / redirect info goes here.]</p>`,
  choices: [],
});

jsPsych.run(timeline);

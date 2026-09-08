/* Deterministic, browser-local evaluation for sentence-fragment writing tasks. */
(function createOpenTextEvaluator() {
  const rulesPackage = window.EVALUATION_RULES || { version: 'missing', items: {} };
  const connectors = rulesPackage.connectorWords || [
    'even though', 'although', 'because', 'unless', 'whenever', 'whereas',
    'while', 'when', 'if', 'since', 'though', 'until', 'after', 'before',
    'once', 'as', 'which', 'who', 'whose', 'that'
  ];
  const connectorTokens = new Set(connectors.flatMap((word) => word.split(' ')));
  const subjectPronouns = new Set([
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'who', 'someone', 'anyone',
    'everyone', 'nobody', 'somebody', 'this', 'that', 'these', 'those'
  ]);
  const objectOnlyPronouns = new Set(['me', 'him', 'her', 'us', 'them', 'whom']);
  const determiners = new Set([
    'a', 'an', 'the', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
    'each', 'every', 'several', 'some', 'many', 'few', 'one', 'two', 'three'
  ]);
  const prepositions = new Set([
    'about', 'above', 'across', 'against', 'along', 'among', 'around', 'at',
    'behind', 'below', 'beneath', 'beside', 'between', 'by', 'during', 'for',
    'from', 'in', 'inside', 'into', 'near', 'of', 'off', 'on', 'over',
    'through', 'toward', 'under', 'up', 'with', 'within', 'without'
  ]);
  const comparisonStopWords = new Set([
    ...determiners, ...prepositions, ...connectorTokens,
    'and', 'or', 'but', 'so', 'yet', 'nor', 'not', 'never', 'very', 'too',
    'also', 'then', 'than', 'there', 'here'
  ]);
  const subjectStopWords = new Set([
    ...prepositions, ...connectorTokens, 'and', 'or', 'but', 'so', 'yet',
    'nor', 'not', 'never', 'very', 'too', 'also', 'then', 'than', 'there',
    'here', 'quickly', 'slowly', 'yesterday', 'today', 'tomorrow'
  ]);
  const modalWords = new Set([
    'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
    "can't", "couldn't", "won't", "wouldn't", "shouldn't", "mustn't"
  ]);
  const doAuxiliaries = new Set(['do', 'does', 'did', "don't", "doesn't", "didn't"]);
  const haveAuxiliaries = new Set(['have', 'has', 'had', "haven't", "hasn't", "hadn't"]);
  const beAuxiliaries = new Set([
    'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', "isn't", "aren't",
    "wasn't", "weren't"
  ]);
  const finiteAuxiliaries = new Set([...modalWords, ...doAuxiliaries, ...haveAuxiliaries, ...beAuxiliaries]);
  const negativeWords = new Set([
    'not', 'never', 'nobody', 'nothing', 'neither', 'no', "can't", "couldn't",
    "won't", "wouldn't", "shouldn't", "mustn't", "don't", "doesn't",
    "didn't", "isn't", "aren't", "wasn't", "weren't", "haven't",
    "hasn't", "hadn't"
  ]);
  const verbBases = new Set([
    'be', 'have', 'do', 'forget', 'submit', 'leave', 'walk', 'run', 'go', 'come',
    'make', 'take', 'give', 'find', 'think', 'know', 'see', 'say', 'tell',
    'write', 'read', 'send', 'bring', 'begin', 'become', 'feel', 'keep', 'hold',
    'meet', 'pay', 'stand', 'sit', 'lose', 'win', 'fall', 'rise', 'speak',
    'choose', 'drive', 'eat', 'drink', 'arrive', 'move', 'ask', 'add', 'open',
    'close', 'finish', 'complete', 'change', 'need', 'want', 'work', 'call',
    'look', 'use', 'include', 'explain', 'show', 'provide', 'clarify', 'delay',
    'light', 'greet', 'post', 'notice', 'carry', 'decide', 'attend', 'return',
    'repeat', 'remain', 'seem', 'display', 'gather', 'follow', 'divide', 'save',
    'turn', 'review', 'study', 'wait', 'pack', 'plan', 'reach', 'reduce',
    'require', 'scatter', 'end', 'start', 'drop', 'help', 'earn', 'describe',
    'contain', 'inform', 'appear', 'continue', 'change', 'improve', 'postpone',
    'prepare', 'revise', 'compare', 'contact', 'decide', 'try', 'remember'
  ]);
  const irregularForms = {
    am: ['be', 'present'], is: ['be', 'present'], are: ['be', 'present'],
    was: ['be', 'past'], were: ['be', 'past'], been: ['be', 'participle'],
    has: ['have', 'present3'], had: ['have', 'past'], does: ['do', 'present3'],
    did: ['do', 'past'], forgot: ['forget', 'past'], forgotten: ['forget', 'participle'],
    left: ['leave', 'past'], went: ['go', 'past'], gone: ['go', 'participle'],
    came: ['come', 'past'], made: ['make', 'past'], took: ['take', 'past'],
    taken: ['take', 'participle'], gave: ['give', 'past'], given: ['give', 'participle'],
    found: ['find', 'past'], thought: ['think', 'past'], knew: ['know', 'past'],
    known: ['know', 'participle'], saw: ['see', 'past'], seen: ['see', 'participle'],
    said: ['say', 'past'], told: ['tell', 'past'], wrote: ['write', 'past'],
    written: ['write', 'participle'], read: ['read', 'base'], sent: ['send', 'past'],
    brought: ['bring', 'past'], began: ['begin', 'past'], begun: ['begin', 'participle'],
    became: ['become', 'past'], felt: ['feel', 'past'], kept: ['keep', 'past'],
    held: ['hold', 'past'], met: ['meet', 'past'], paid: ['pay', 'past'],
    stood: ['stand', 'past'], sat: ['sit', 'past'], lost: ['lose', 'past'],
    won: ['win', 'past'], fell: ['fall', 'past'], rose: ['rise', 'past'],
    spoke: ['speak', 'past'], spoken: ['speak', 'participle'], chose: ['choose', 'past'],
    chosen: ['choose', 'participle'], drove: ['drive', 'past'], driven: ['drive', 'participle'],
    ate: ['eat', 'past'], eaten: ['eat', 'participle'], drank: ['drink', 'past'],
    drunk: ['drink', 'participle'], ran: ['run', 'past']
  };
  const harmlessRepeatedPairs = new Set(['had had', 'that that']);
  const invariantParticiples = new Set(['become', 'come', 'run']);

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFKC')
      .replace(/[’‘]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenize(value) {
    return normalizeText(value)
      .toLowerCase()
      .replace(/[^a-z0-9'\s-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  function candidateBases(word, endingLength, addE = false) {
    const root = word.slice(0, -endingLength);
    const candidates = [root];
    if (/(.)\1$/.test(root)) candidates.push(root.slice(0, -1));
    if (addE) candidates.push(`${root}e`);
    return candidates;
  }

  function verbInfo(token) {
    const word = String(token || '').toLowerCase();
    const contractionBase = word.replace(/n't$/, '');
    if (modalWords.has(word)) return { word, base: contractionBase, form: 'modal', auxiliary: true };
    if (doAuxiliaries.has(word)) {
      const base = /^did/.test(word) ? 'do' : 'do';
      const form = /^did/.test(word) ? 'past' : /^does/.test(word) ? 'present3' : 'base';
      return { word, base, form, auxiliary: true };
    }
    if (haveAuxiliaries.has(word)) {
      const form = /^had/.test(word) ? 'past' : /^has/.test(word) ? 'present3' : 'base';
      return { word, base: 'have', form, auxiliary: true };
    }
    if (beAuxiliaries.has(word)) {
      const clean = word.replace(/n't$/, '');
      const data = irregularForms[clean] || ['be', clean === 'be' ? 'base' : 'participle'];
      return { word, base: data[0], form: data[1], auxiliary: true };
    }
    if (irregularForms[word]) {
      return { word, base: irregularForms[word][0], form: irregularForms[word][1], auxiliary: false };
    }
    if (verbBases.has(word)) return { word, base: word, form: 'base', auxiliary: false };
    if (/ying$/.test(word) && verbBases.has(`${word.slice(0, -4)}ie`)) {
      return { word, base: `${word.slice(0, -4)}ie`, form: 'ing', auxiliary: false };
    }
    if (/ing$/.test(word)) {
      const base = candidateBases(word, 3, true).find((entry) => verbBases.has(entry));
      if (base || word.length > 5) return { word, base: base || word.slice(0, -3), form: 'ing', auxiliary: false };
    }
    if (/ied$/.test(word)) return { word, base: `${word.slice(0, -3)}y`, form: 'past', auxiliary: false };
    if (/ed$/.test(word)) {
      const base = candidateBases(word, 2, true).find((entry) => verbBases.has(entry));
      if (base || word.length > 4) return { word, base: base || word.slice(0, -2), form: 'pastParticiple', auxiliary: false };
    }
    if (/ies$/.test(word)) return { word, base: `${word.slice(0, -3)}y`, form: 'present3', auxiliary: false };
    if (/es$/.test(word)) {
      const candidates = [word.slice(0, -2), word.slice(0, -1)];
      const base = candidates.find((entry) => verbBases.has(entry));
      if (base) return { word, base, form: 'present3', auxiliary: false };
    }
    if (/s$/.test(word) && word.length > 3 && verbBases.has(word.slice(0, -1))) {
      return { word, base: word.slice(0, -1), form: 'present3', auxiliary: false };
    }
    return null;
  }

  function stem(token) {
    const word = String(token || '').toLowerCase().replace(/'s$/, '');
    const verb = verbInfo(word);
    if (verb) return verb.base;
    if (word.length > 4 && /ies$/.test(word)) return `${word.slice(0, -3)}y`;
    if (word.length > 4 && /s$/.test(word) && !/ss$/.test(word)) return word.slice(0, -1);
    return word;
  }

  function contentStems(value) {
    return tokenize(value)
      .filter((token) => !comparisonStopWords.has(token) && token.length > 2)
      .map(stem);
  }

  function preservationRatio(source, response) {
    const sourceTerms = [...new Set(contentStems(source))];
    const responseTerms = new Set(contentStems(response));
    if (!sourceTerms.length) return 1;
    return sourceTerms.filter((term) => responseTerms.has(term)).length / sourceTerms.length;
  }

  function tokenSequenceIndex(words, sequence) {
    if (!sequence.length || sequence.length > words.length) return -1;
    for (let index = 0; index <= words.length - sequence.length; index += 1) {
      if (sequence.every((word, offset) => words[index + offset] === word)) return index;
    }
    return -1;
  }

  function sourceSubjectPrefix(source) {
    const words = tokenize(source);
    if (!words.length || verbInfo(words[0]) || prepositions.has(words[0]) || connectorTokens.has(words[0])) return [];
    const prefix = [];
    for (let index = 0; index < words.length; index += 1) {
      const word = words[index];
      if (index > 0 && (prepositions.has(word) || connectorTokens.has(word) || verbInfo(word))) break;
      prefix.push(word);
    }
    return prefix;
  }

  function frontedVerbPhrase(value) {
    const text = normalizeText(value);
    const commaIndex = text.lastIndexOf(',');
    if (commaIndex < 1) return null;
    const front = tokenize(text.slice(0, commaIndex));
    const tail = tokenize(text.slice(commaIndex + 1));
    const first = verbInfo(front[0]);
    const auxiliary = tail.at(-1) || '';
    const subjectWords = tail.slice(0, -1);
    if (!first || first.auxiliary || first.form !== 'base' || !doAuxiliaries.has(auxiliary)
      || !subjectWords.some(isSubjectCandidate)) return null;
    return {
      frontedVerb: first.word,
      helpingVerb: auxiliary,
      subject: subjectWords.join(' ')
    };
  }

  function sentenceParts(value) {
    return String(value || '')
      .match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) || [];
  }

  function connectorAtStart(value) {
    const lower = normalizeText(value).toLowerCase().replace(/^["']+/, '');
    if (/^once upon a time\b/.test(lower)) return '';
    return connectors.find((word) => lower === word || lower.startsWith(`${word} `)) || '';
  }

  function connectorIn(value) {
    const lower = ` ${normalizeText(value).toLowerCase()} `;
    return connectors.find((word) => lower.includes(` ${word} `)) || '';
  }

  function isFiniteAt(words, index) {
    const info = verbInfo(words[index]);
    if (!info) return false;
    if (finiteAuxiliaries.has(words[index])) return !['be', 'been', 'being'].includes(words[index]);
    const before = words.slice(Math.max(0, index - 4), index)
      .filter((word) => !['not', 'never', 'really', 'usually', 'often', 'always'].includes(word));
    const controller = before.at(-1) || '';
    if (controller === 'to' || modalWords.has(controller) || doAuxiliaries.has(controller)
      || haveAuxiliaries.has(controller) || beAuxiliaries.has(controller)) return false;
    return !['ing', 'participle'].includes(info.form);
  }

  function isSubjectCandidate(word) {
    if (!word || objectOnlyPronouns.has(word) || subjectStopWords.has(word)) return false;
    if (subjectPronouns.has(word)) return true;
    if (determiners.has(word)) return false;
    if (verbInfo(word) || /ly$/.test(word) || /^\d+$/.test(word)) return false;
    return true;
  }

  function nearestSubject(words, verbIndex, lowerBound = 0) {
    for (let index = verbIndex - 1; index >= lowerBound; index -= 1) {
      const word = words[index];
      if (subjectPronouns.has(word)) return { word, index };
      if (determiners.has(word) && words[index + 1] && isSubjectCandidate(words[index + 1])) {
        return { word: words[index + 1], index: index + 1 };
      }
      if (isSubjectCandidate(word)) return { word, index };
    }
    return null;
  }

  function subjectForFinite(words, verbIndex) {
    const word = words[verbIndex];
    if (verbIndex === 1 && words[0] === 'there' && /^('?[a-z]+)?$/.test(word)) {
      const info = verbInfo(word);
      if (info?.base === 'be') return { word: 'there', index: 0, existential: true };
    }
    if (verbIndex === 0 && finiteAuxiliaries.has(word)) {
      const nextVerb = words.findIndex((candidate, index) => index > 1 && Boolean(verbInfo(candidate)));
      const subject = words.slice(1, nextVerb > 1 ? nextVerb : 4).findIndex((candidate) => (
        subjectPronouns.has(candidate) || isSubjectCandidate(candidate)
      ));
      if (subject >= 0) return { word: words[subject + 1], index: subject + 1, inverted: true };
    }
    return nearestSubject(words, verbIndex);
  }

  function finitePairs(value) {
    const words = tokenize(value);
    return words.map((word, index) => ({ word, index, info: verbInfo(word) }))
      .filter((entry) => isFiniteAt(words, entry.index))
      .map((entry) => ({ ...entry, subject: subjectForFinite(words, entry.index) }))
      .filter((entry) => entry.subject);
  }

  function isStandardQuestion(value) {
    const text = normalizeText(value);
    const words = tokenize(text);
    if (!text.endsWith('?') || words.length < 3 || !finiteAuxiliaries.has(words[0])) return false;
    const subject = subjectForFinite(words, 0);
    return Boolean(subject && words.slice(subject.index + 1).some((word) => verbInfo(word)));
  }

  function startsWithPhrase(value) {
    const words = tokenize(value);
    if (!words.length) return false;
    if (words[0] === 'to' || prepositions.has(words[0])) return true;
    const first = verbInfo(words[0]);
    return Boolean(first && ['ing', 'participle', 'pastParticiple'].includes(first.form));
  }

  function hasIndependentClause(value) {
    const text = normalizeText(value);
    if (!text) return false;
    if (isStandardQuestion(text)) return true;
    if (frontedVerbPhrase(text)) return true;
    const pairs = finitePairs(text);
    const openingConnector = connectorAtStart(text);
    if (openingConnector) {
      const commaIndex = text.lastIndexOf(',');
      if (commaIndex >= 0) return finitePairs(text.slice(commaIndex + 1)).length >= 1;
      if (pairs.length < 2) return false;
      const words = tokenize(text);
      const firstVerb = pairs[0].index;
      return pairs.slice(1).some((pair) => {
        const between = words.slice(firstVerb + 1, pair.subject.index);
        return !between.some((word) => connectorTokens.has(word));
      });
    }
    if (startsWithPhrase(text)) return pairs.length >= 1;
    return pairs.length >= 1;
  }

  function hasSubjectBeforeVerb(value) {
    return finitePairs(value).length > 0;
  }

  function hasMainVerb(value) {
    return finitePairs(value).length > 0;
  }

  function dependentWordsAttached(value) {
    const text = normalizeText(value);
    const found = connectorIn(text);
    if (!found) return false;
    const pairs = finitePairs(text);
    const opening = connectorAtStart(text);
    if (opening) return hasIndependentClause(text);
    if (['who', 'which', 'whose', 'that'].includes(found)) return pairs.length >= 2;
    const lower = text.toLowerCase();
    const connectorIndex = lower.indexOf(` ${found} `);
    if (connectorIndex < 0) return false;
    return finitePairs(text.slice(0, connectorIndex)).length >= 1
      && finitePairs(text.slice(connectorIndex + found.length + 2)).length >= 1;
  }

  function actionBases(value) {
    return tokenize(value).map(verbInfo).filter(Boolean)
      .filter((info) => !info.auxiliary)
      .map((info) => info.base);
  }

  function infinitiveActionLinks(value) {
    const words = tokenize(value);
    const links = [];
    words.forEach((word, index) => {
      const first = verbInfo(word);
      const second = verbInfo(words[index + 2]);
      if (first && !first.auxiliary && words[index + 1] === 'to' && second && !second.auxiliary) {
        links.push([first.base, second.base]);
      }
    });
    return links;
  }

  function preservesInfinitiveLink(source, response, link) {
    if (infinitiveActionLinks(response).some(([first, second]) => first === link[0] && second === link[1])) return true;
    if (link[0] === 'forget') {
      const first = actionOccurrences(response, link[0])[0];
      const second = actionOccurrences(response, link[1])[0];
      if (first && second && beAuxiliaries.has(first.words[first.index - 1])
        && first.words.slice(first.index + 1, second.index).some((word) => word === 'and')) return true;
    }
    return false;
  }

  function sourceEvidence(source) {
    const cleaned = String(source || '').replace(/_{3,}/g, ' ');
    const actions = [...new Set(actionBases(cleaned))];
    const terms = [...new Set(contentStems(cleaned))];
    return {
      actions,
      primaryAction: actions[0] || '',
      terms,
      details: terms.filter((term) => !actions.includes(term))
    };
  }

  function actionOccurrences(value, base) {
    const words = tokenize(value);
    return words.map((word, index) => ({ word, index, info: verbInfo(word) }))
      .filter((entry) => entry.info?.base === base)
      .map((entry) => ({ ...entry, words }));
  }

  function subjectLinkedToAction(value, base) {
    return actionOccurrences(value, base).some((entry) => {
      const { words, index } = entry;
      const previous = words[index - 1] || '';
      if (previous === 'to') return false;
      if (beAuxiliaries.has(previous)) return Boolean(nearestSubject(words, index - 1));
      if (index > 1 && (doAuxiliaries.has(words[0]) || modalWords.has(words[0]))) {
        return Boolean(subjectForFinite(words, 0));
      }
      return Boolean(nearestSubject(words, index));
    });
  }

  function actionContext(value, base) {
    const occurrence = actionOccurrences(value, base)[0];
    if (!occurrence) return { found: false, tense: 'missing', negated: false, modal: '' };
    const { words, index, info } = occurrence;
    const before = words.slice(Math.max(0, index - 4), index);
    const modal = [...before].reverse().find((word) => modalWords.has(word)) || '';
    const negated = before.some((word) => negativeWords.has(word));
    let tense = info.form;
    if (before.some((word) => /^did/.test(word))) tense = 'past';
    else if (before.some((word) => /^had/.test(word))) tense = 'past';
    else if (before.some((word) => /^(was|were|wasn't|weren't)$/.test(word))) tense = 'past';
    else if (before.some((word) => /^(has|have|hasn't|haven't)$/.test(word))) tense = 'present';
    else if (modal) tense = 'modal';
    else if (info.form === 'present3' || info.form === 'base') tense = 'present';
    else if (info.form === 'pastParticiple') tense = 'past';
    return { found: true, tense, negated, modal };
  }

  function sameTense(sourceContext, responseContext) {
    if (!sourceContext.found || !responseContext.found) return false;
    if (sourceContext.tense === responseContext.tense) return true;
    return sourceContext.tense === 'past' && responseContext.tense === 'pastParticiple';
  }

  function repeatedWord(value) {
    const words = tokenize(value);
    for (let index = 1; index < words.length; index += 1) {
      const pair = `${words[index - 1]} ${words[index]}`;
      if (words[index - 1] === words[index] && !harmlessRepeatedPairs.has(pair)) return words[index];
    }
    return '';
  }

  function nextVerb(words, startIndex) {
    for (let index = startIndex + 1; index < words.length && index <= startIndex + 4; index += 1) {
      if (['not', 'never', 'really', 'usually', 'often', 'always'].includes(words[index])) continue;
      const info = verbInfo(words[index]);
      if (info) return { index, info };
      if (!/ly$/.test(words[index])) break;
    }
    return null;
  }

  function grammarIssues(value) {
    const text = normalizeText(value);
    const words = tokenize(text);
    const issues = [];
    const duplicate = repeatedWord(text);
    if (duplicate) issues.push({
      code: 'REPEATED_WORD', severity: 'blocking',
      message: `Use “${duplicate}” only once in this part of the sentence.`
    });

    words.forEach((word, index) => {
      if (word === 'to') {
        const candidate = nextVerb(words, index);
        if (candidate && candidate.index === index + 1 && candidate.info.form !== 'base') {
          issues.push({
            code: 'INFINITIVE_FORM', severity: 'blocking',
            message: `After “to,” use the base form of the verb, not “${words[candidate.index]}.”`
          });
        }
      }
      if (doAuxiliaries.has(word)) {
        const candidate = nextVerb(words, index);
        if (candidate && candidate.info.form !== 'base') {
          issues.push({
            code: 'DO_SUPPORT_FORM', severity: 'blocking',
            message: `After “${word},” use the base form of the verb.`
          });
        }
      }
      if (modalWords.has(word)) {
        const candidate = nextVerb(words, index);
        if (candidate && candidate.info.form !== 'base') {
          issues.push({
            code: 'MODAL_VERB_FORM', severity: 'blocking',
            message: `After “${word},” use the base form of the verb.`
          });
        }
      }
      if (haveAuxiliaries.has(word)) {
        const candidate = nextVerb(words, index);
        if (candidate && !['participle', 'pastParticiple'].includes(candidate.info.form)
          && !/ed$/.test(candidate.info.word) && !invariantParticiples.has(candidate.info.word)) {
          issues.push({
            code: 'PERFECT_VERB_FORM', severity: 'blocking',
            message: `Check the verb form after “${word}.”`
          });
        }
      }
    });

    finitePairs(text).forEach((pair) => {
      const subject = pair.subject?.word;
      const info = pair.info;
      if (!subject || info.auxiliary || info.form === 'past') return;
      if (['he', 'she', 'it', 'this', 'that'].includes(subject) && info.form === 'base') {
        issues.push({
          code: 'SUBJECT_VERB_AGREEMENT', severity: 'blocking',
          message: `Make the main verb agree with “${subject}.”`
        });
      }
      if (['i', 'you', 'we', 'they', 'these', 'those'].includes(subject) && info.form === 'present3') {
        issues.push({
          code: 'SUBJECT_VERB_AGREEMENT', severity: 'blocking',
          message: `Make the main verb agree with “${subject}.”`
        });
      }
    });

    if (/\byou (?:are|'re) (?:an? )?(?:worthless|stupid|an idiot|a moron)\b/i.test(text)
      || /\bworthless street rat\b/i.test(text)) {
      issues.push({
        code: 'INAPPROPRIATE_LANGUAGE', severity: 'blocking',
        message: 'Use respectful, course-appropriate language in the revision.'
      });
    }

    const opening = connectorAtStart(text);
    if (opening && !text.includes(',') && finitePairs(text).length >= 2) {
      issues.push({
        code: 'OPENING_CLAUSE_PUNCTUATION', severity: 'advisory',
        message: 'Add a comma after the opening dependent clause.'
      });
    } else if (/^once upon a time\b/i.test(text) && !/^once upon a time,/i.test(text)) {
      issues.push({
        code: 'OPENING_PHRASE_PUNCTUATION', severity: 'advisory',
        message: 'A comma after the opening phrase would make the sentence easier to read.'
      });
    }

    const complexTail = text.match(/\b(?:when|while|after|before|because|although|if|unless)\s+((?:the|a|an)\s+[^,.!?]+)/i);
    if (complexTail) {
      const tailWords = tokenize(complexTail[1]);
      const firstFinite = tailWords.findIndex((word, index) => isFiniteAt(tailWords, index));
      const pronounBeforeFinite = firstFinite > 1 && tailWords.slice(1, firstFinite).some((word) => subjectPronouns.has(word));
      const laterFinite = firstFinite >= 0 && tailWords.slice(firstFinite + 1).some((word, offset) => (
        isFiniteAt(tailWords, firstFinite + 1 + offset)
      ));
      if (pronounBeforeFinite && !laterFinite) {
        issues.push({
          code: 'UNCERTAIN_CLAUSE_STRUCTURE', severity: 'review',
          message: 'The clause order is unusual, so the local checker cannot confirm that every thought is complete.'
        });
      }
    }

    return issues.filter((issue, index, all) => (
      all.findIndex((candidate) => candidate.code === issue.code) === index
    ));
  }

  function isOffTask(value) {
    const text = normalizeText(value).toLowerCase();
    if (!text) return false;
    if (/^(idk|i don'?t know|dunno|n\/?a|none|no idea|skip)[.!?]*$/.test(text)) return true;
    if (/https?:\/\/|www\.|<script|```/.test(text)) return true;
    return tokenize(text).length === 1 && !verbInfo(tokenize(text)[0]);
  }

  function effectiveResponse(rule, response) {
    const text = normalizeText(response);
    if (rule.contract?.responseScope !== 'blankOrFullSentence') return text;
    const source = String(rule.sourceText || '');
    const prefix = source.split(/_{3,}/)[0].trim().replace(/[,;:]?\s*$/, ',');
    const requiredConnector = connectorAtStart(prefix);
    if (requiredConnector && !new RegExp(`\\b${requiredConnector.replace(' ', '\\s+')}\\b`, 'i').test(text)) {
      return `${prefix} ${text}`;
    }
    return text;
  }

  function sourceMeaning(rule, response) {
    if (!rule.contract?.preserveSourceMeaning || rule.kind === 'writeWithConnector') {
      return { preserved: true, ratio: 1, actionsPreserved: true, detailsPreserved: true };
    }
    const source = String(rule.sourceText || '').replace(/_{3,}/g, ' ');
    const evidence = sourceEvidence(source);
    const responseActionSet = new Set(actionBases(response));
    const responseTerms = new Set(contentStems(response));
    const requiredActions = evidence.actions;
    const actionMatches = requiredActions.filter((action) => responseActionSet.has(action));
    const detailMatches = evidence.details.filter((detail) => responseTerms.has(detail));
    const actionsPreserved = !requiredActions.length || actionMatches.length === requiredActions.length;
    const detailRatio = evidence.details.length ? detailMatches.length / evidence.details.length : 1;
    const detailThreshold = rule.kind === 'paragraphRepair' ? 0.7 : 0.65;
    const detailsPreserved = detailRatio >= detailThreshold;
    const ratio = preservationRatio(source, response);
    return {
      preserved: actionsPreserved && detailsPreserved && ratio >= (rule.kind === 'paragraphRepair' ? 0.72 : 0.65),
      ratio,
      actionsPreserved,
      detailsPreserved,
      missingActions: requiredActions.filter((action) => !responseActionSet.has(action)),
      missingDetails: evidence.details.filter((detail) => !responseTerms.has(detail)),
      primaryAction: evidence.primaryAction
    };
  }

  function addedFinitePredicate(source, response) {
    const sourceFinite = new Set(finitePairs(source).map((pair) => pair.info.base));
    const responsePairs = finitePairs(response);
    if (responsePairs.some((pair) => !sourceFinite.has(pair.info.base) || pair.info.auxiliary)) return true;
    const sourceNormalized = normalizeText(source).replace(/[.!?]+$/, '').toLowerCase();
    const responseNormalized = normalizeText(response).replace(/[.!?]+$/, '').toLowerCase();
    return sourceNormalized !== responseNormalized && responsePairs.length > 0;
  }

  function repairStrategy(rule, response, checks, evidence) {
    const completionVerified = rule.kind === 'paragraphRepair'
      ? checks.allSentencesComplete
      : checks.hasIndependentClause;
    const valid = checks.targetMet && completionVerified;
    const fallback = {
      id: valid ? 'valid_unclassified_repair' : 'target_not_repaired',
      label: valid ? 'Valid complete-sentence repair' : 'Target remains unresolved',
      confidence: valid ? 'low' : 'high',
      evidenceDirectness: valid ? 'indirect' : 'direct'
    };
    if (!valid) return fallback;
    if (!checks.sourceMeaningPreserved) {
      return {
        id: 'meaning_not_preserved', label: 'Complete sentence with changed source meaning',
        confidence: 'high', evidenceDirectness: 'none'
      };
    }

    if (rule.kind === 'repairMissingSubject') {
      if (isStandardQuestion(response)) {
        return {
          id: 'subject_added_in_question', label: 'Subject added in a question',
          confidence: 'high', evidenceDirectness: 'direct'
        };
      }
      return {
        id: 'subject_added', label: 'Subject added to the original action',
        confidence: 'high', evidenceDirectness: 'direct'
      };
    }

    if (rule.kind === 'repairMissingPredicate') {
      const source = String(rule.sourceText || '').replace(/_{3,}/g, ' ');
      const sourceWords = tokenize(source);
      const responseWords = tokenize(response);
      const subjectPrefix = sourceSubjectPrefix(source);
      const subjectPosition = tokenSequenceIndex(responseWords, subjectPrefix);
      const sourcePosition = tokenSequenceIndex(responseWords, sourceWords);
      const fronted = frontedVerbPhrase(response);
      const commaIndex = normalizeText(response).indexOf(',');
      const frontedSourceGroup = commaIndex > 0
        && tokenSequenceIndex(tokenize(normalizeText(response).slice(0, commaIndex)), sourceWords) === 0
        && finitePairs(normalizeText(response).slice(commaIndex + 1)).length > 0;
      const sourceAction = evidence.primaryAction;
      const helpingCompletion = sourceAction && subjectPosition === 0
        ? actionOccurrences(response, sourceAction).find((entry) => (
          beAuxiliaries.has(entry.words[entry.index - 1])
          && !actionOccurrences(source, sourceAction).some((sourceEntry) => (
            beAuxiliaries.has(sourceEntry.words[sourceEntry.index - 1])
          ))
        ))
        : null;

      if (fronted && (sourcePosition > 0 || subjectPosition > 0)) {
        return {
          id: 'embedded_with_inversion', label: 'Original word group embedded with inverted word order',
          confidence: 'high', evidenceDirectness: 'indirect', details: fronted
        };
      }
      if (frontedSourceGroup) {
        return {
          id: 'embedded_with_fronting', label: 'Original word group fronted within a new sentence',
          confidence: 'high', evidenceDirectness: 'indirect'
        };
      }
      if (helpingCompletion) {
        return {
          id: 'helping_verb_added', label: 'Helping verb added to complete the predicate',
          confidence: 'high', evidenceDirectness: 'direct',
          details: {
            helpingVerb: helpingCompletion.words[helpingCompletion.index - 1],
            verb: helpingCompletion.word
          }
        };
      }
      if (sourcePosition > 0 || subjectPosition > 0) {
        return {
          id: 'embedded_word_group', label: 'Original word group embedded in a new sentence',
          confidence: 'high', evidenceDirectness: 'indirect'
        };
      }
      if (subjectPrefix.length && subjectPosition === 0 && addedFinitePredicate(source, response)) {
        return {
          id: 'predicate_added_to_original_subject', label: 'Predicate added to the original subject',
          confidence: 'high', evidenceDirectness: 'direct'
        };
      }
      return fallback;
    }

    const strategies = {
      attachDependentClause: ['dependent_clause_attached', 'Dependent words connected to a complete thought'],
      integratePhraseFragment: ['phrase_integrated', 'Phrase incorporated into a complete sentence'],
      writeWithConnector: ['connector_used', 'Requested connecting word used in a complete sentence'],
      paragraphRepair: ['paragraph_fragments_repaired', 'Paragraph fragments repaired']
    };
    const selected = strategies[rule.kind];
    if (!selected) return fallback;
    return { id: selected[0], label: selected[1], confidence: 'high', evidenceDirectness: 'direct' };
  }

  function withoutEndPunctuation(value) {
    return normalizeText(value).replace(/[.!?]+$/g, '').trim().toLowerCase();
  }

  function exactTargetStillStandalone(response, target) {
    const expected = withoutEndPunctuation(target);
    return sentenceParts(response).some((part) => withoutEndPunctuation(part) === expected);
  }

  function issue(code, message, severity = 'blocking') {
    return { code, message, severity };
  }

  function contractIssues(rule, response, meaning, sourceContext, responseContext) {
    const contract = rule.contract || {};
    const issues = [];
    if (contract.oneSentence && sentenceParts(response).length > 1) {
      issues.push(issue('MULTIPLE_SENTENCES', 'Write one complete sentence for this task.'));
    }
    if (contract.sentenceForm === 'statement' && response.endsWith('?')) {
      issues.push(issue('QUESTION_NOT_REQUESTED', 'Write a statement rather than a question for this task.'));
    }
    if (contract.preservePrimaryPolarity && sourceContext.found && responseContext.found
      && sourceContext.negated !== responseContext.negated) {
      issues.push(issue('POLARITY_CHANGED', 'Keep the original positive or negative meaning.'));
    }
    if (contract.preservePrimaryModality && sourceContext.found && responseContext.found
      && sourceContext.modal !== responseContext.modal) {
      issues.push(issue('MODALITY_CHANGED', 'Keep the original action instead of changing it to advice, possibility, or obligation.'));
    }
    if (contract.preservePrimaryTense && sourceContext.found && responseContext.found
      && !sameTense(sourceContext, responseContext)) {
      issues.push(issue('TENSE_CHANGED', 'Keep the original time of the action.'));
    }
    if (contract.keepRequestedConnector) {
      const requested = rule.requestedWord || connectorAtStart(rule.sourceText || '');
      if (requested && !new RegExp(`\\b${requested.replace(' ', '\\s+')}\\b`, 'i').test(response)) {
        issues.push(issue('REQUIRED_CONNECTOR_REMOVED', `Keep the word “${requested}” in the repair.`));
      }
    }
    if (contract.preservePrimaryAction) {
      const brokenLink = infinitiveActionLinks(rule.sourceText || '')
        .find((link) => !preservesInfinitiveLink(rule.sourceText || '', response, link));
      if (brokenLink && meaning.actionsPreserved) {
        issues.push(issue('ACTION_RELATION_CHANGED', `Keep the original relationship between “${brokenLink[0]}” and “${brokenLink[1]}.”`));
      }
    }
    if (!meaning.preserved && meaning.primaryAction && meaning.missingActions?.includes(meaning.primaryAction)) {
      issues.push(issue('ORIGINAL_ACTION_CHANGED', 'Keep the original action and repair the fragment without replacing its main idea.'));
    } else if (!meaning.preserved) {
      issues.push(issue('REQUIRED_DETAIL_REMOVED', 'Keep the original action and key details while making the repair.'));
    }
    return issues;
  }

  function paragraphEvaluation(rule, response, checks) {
    const targets = rule.targetFragments || [];
    const sentences = sentenceParts(response);
    checks.allTargetsAddressed = targets.every((target) => !exactTargetStillStandalone(response, target));
    checks.allSentencesComplete = sentences.length > 0 && sentences.every(hasIndependentClause);
    checks.targetMet = checks.allTargetsAddressed;
    if (rule.sampleRepair && preservationRatio(rule.sampleRepair, response) >= 0.9 && checks.allTargetsAddressed) {
      checks.allSentencesComplete = true;
    }
  }

  function targetEvidence(rule, checks, strategy) {
    const tag = rule.targetTag || '';
    if (!tag) return [];
    if (!checks.nonEmpty || !checks.onTask || !checks.sourceMeaningPreserved) {
      return [{
        tag, outcome: 'none', strength: 'none', directness: 'none',
        reason: 'This response does not provide reliable misconception evidence.'
      }];
    }
    if (checks.targetMet) {
      const indirect = strategy?.evidenceDirectness === 'indirect';
      return [{
        tag,
        outcome: 'counterevidence',
        strength: indirect ? 'limited' : 'strong',
        directness: indirect ? 'indirect' : 'direct',
        reason: indirect
          ? 'The response is a valid repair, but it demonstrates the targeted skill indirectly by changing how the original word group functions.'
          : 'The targeted fragment repair was demonstrated directly.'
      }];
    }
    return [{
      tag, outcome: 'supports', strength: 'strong', directness: 'direct',
      reason: 'The targeted fragment problem remains unresolved.'
    }];
  }

  function strategyFeedback(strategy) {
    const id = strategy?.id || '';
    if (id === 'predicate_added_to_original_subject') {
      return 'You kept the original noun phrase as the subject and added a main verb that completes the thought.';
    }
    if (id === 'helping_verb_added') {
      const helpingVerb = strategy.details?.helpingVerb;
      const verb = strategy.details?.verb;
      if (helpingVerb && verb) {
        return `You added the helping verb “${helpingVerb},” making “${helpingVerb} ${verb}” a complete verb.`;
      }
      return 'You added a helping verb to form a complete verb and finish the thought.';
    }
    if (id === 'embedded_with_inversion' || id === 'embedded_with_fronting') {
      return 'You incorporated the original word group into a complete sentence. The sentence uses an unusual word order, but it still has a subject and a complete verb.';
    }
    if (id === 'embedded_word_group') {
      return 'You incorporated the original word group into a new complete sentence while keeping its key meaning.';
    }
    if (id === 'valid_unclassified_repair') {
      return 'Your revision incorporates the original word group into a complete sentence while keeping its key meaning.';
    }
    if (id === 'meaning_not_preserved') {
      return 'You formed a complete sentence.';
    }
    return '';
  }

  function targetAcknowledgment(kind, strategy) {
    const specific = strategyFeedback(strategy);
    if (specific) return specific;
    const messages = {
      repairMissingSubject: 'You added who or what performs the original action.',
      repairMissingPredicate: 'You added a main action for the original subject.',
      attachDependentClause: 'You connected the dependent words to another clause.',
      integratePhraseFragment: 'You attached the original phrase to a larger sentence.',
      writeWithConnector: 'You used the requested connecting word.',
      paragraphRepair: 'You addressed the target fragments in the paragraph.'
    };
    return messages[kind] || 'You made the requested change.';
  }

  function targetRetry(kind) {
    const messages = {
      repairMissingSubject: 'Add who or what performs the original action. Place that subject where it clearly belongs with the action.',
      repairMissingPredicate: 'Add a main verb that tells what the original subject does or is.',
      attachDependentClause: 'Keep the dependent word group and connect it to a complete thought.',
      integratePhraseFragment: 'Keep the phrase and attach it to a complete sentence with a clear subject and main verb.',
      writeWithConnector: 'Use the requested word to connect a dependent clause to a complete thought.',
      paragraphRepair: 'Repair each selected fragment while keeping the paragraph’s original meaning.'
    };
    return messages[kind] || 'Complete the requested repair while preserving the original idea.';
  }

  function positiveFeedback(kind, strategy) {
    const specific = strategyFeedback(strategy);
    if (specific) return specific;
    const messages = {
      repairMissingSubject: 'Your revision supplies a subject, keeps the original action, and forms a complete sentence.',
      repairMissingPredicate: 'Your revision supplies a main action for the original subject and forms a complete sentence.',
      attachDependentClause: 'Your revision keeps the dependent relationship and connects it to a complete thought.',
      integratePhraseFragment: 'Your revision integrates the phrase into a complete sentence.',
      writeWithConnector: 'Your sentence uses the requested connecting word and includes a complete thought.',
      paragraphRepair: 'Your revision addresses the fragments while preserving the paragraph’s meaning.'
    };
    return messages[kind] || 'Your response makes the requested change and preserves the original idea.';
  }

  function chooseFeedback(rule, status, checks, responseIssues, advisories, strategy) {
    const inappropriate = responseIssues.find((entry) => entry.code === 'INAPPROPRIATE_LANGUAGE');
    if (inappropriate) return inappropriate.message;
    if (!checks.nonEmpty) return 'Enter a response before checking your work.';
    if (!checks.onTask) return 'Enter a complete revision that responds to the sentence-fragment task.';

    const meaningIssue = responseIssues.find((entry) => (
      ['ORIGINAL_ACTION_CHANGED', 'REQUIRED_DETAIL_REMOVED', 'POLARITY_CHANGED', 'MODALITY_CHANGED', 'TENSE_CHANGED'].includes(entry.code)
    ));
    if (meaningIssue) {
      const opening = checks.targetMet ? `${targetAcknowledgment(rule.kind, strategy)} ` : '';
      return `${opening}${meaningIssue.message}`;
    }

    if (!checks.targetMet) return targetRetry(rule.kind);

    const blockingGrammar = responseIssues.find((entry) => entry.severity === 'blocking');
    if (blockingGrammar) return `${targetAcknowledgment(rule.kind, strategy)} ${blockingGrammar.message}`;

    if (status === 'needsReview') {
      const review = responseIssues.find((entry) => entry.severity === 'review');
      return review?.message || 'The response may be valid, but the local checker needs a structured follow-up to confirm the skill.';
    }

    const positive = positiveFeedback(rule.kind, strategy);
    return advisories.length ? `${positive} ${advisories[0].message}` : positive;
  }

  function evaluateOpenText(item, answer) {
    const rule = item?.evaluation || rulesPackage.items[item?.id];
    const submittedResponse = typeof answer === 'object' && answer !== null ? answer.text : answer;
    const submitted = normalizeText(submittedResponse);

    if (!rule) {
      return {
        status: 'needsReview', taskCorrect: false, score: 0, confidence: 'low',
        evaluatorVersion: rulesPackage.version,
        repairStrategy: {
          id: 'unknown_rule', label: 'No local evaluation contract',
          confidence: 'low', evidenceDirectness: 'none'
        },
        sentenceComplete: false,
        meaningPreserved: false,
        checks: { nonEmpty: Boolean(submitted), unknownRule: true },
        quality: { targetMet: false, meaningPreserved: false, grammarAcceptable: false, responseContractMet: false },
        misconceptionEvidence: [], responseIssues: [issue('UNKNOWN_RULE', 'This item does not yet have a local evaluation contract.', 'review')],
        advisories: [], reasons: ['This item does not yet have a local evaluation contract.'],
        feedback: 'A structured follow-up is needed to score this response locally.'
      };
    }

    const response = effectiveResponse(rule, submitted);
    const source = String(rule.sourceText || '').replace(/_{3,}/g, ' ');
    const evidence = sourceEvidence(source);
    const meaning = sourceMeaning(rule, response);
    const sourceContext = actionContext(source, evidence.primaryAction);
    const responseContext = actionContext(response, evidence.primaryAction);
    const grammar = grammarIssues(response);
    const advisories = grammar.filter((entry) => entry.severity === 'advisory');
    const reviewIssues = grammar.filter((entry) => entry.severity === 'review');
    const blockingGrammar = grammar.filter((entry) => entry.severity === 'blocking');
    const checks = {
      nonEmpty: Boolean(submitted),
      onTask: Boolean(submitted) && !isOffTask(submitted),
      sourceMeaningPreserved: meaning.preserved,
      preservesSourceContent: meaning.preserved,
      preservationRatio: meaning.ratio,
      actionsPreserved: meaning.actionsPreserved,
      detailsPreserved: meaning.detailsPreserved,
      hasSubject: hasSubjectBeforeVerb(response),
      hasMainVerb: hasMainVerb(response),
      hasIndependentClause: hasIndependentClause(response),
      hasCompleteThought: hasIndependentClause(response),
      oneSentence: rule.contract?.oneSentence ? sentenceParts(response).length === 1 : true,
      targetMet: false,
      grammarAcceptable: blockingGrammar.length === 0,
      responseContractMet: true,
      uncertain: reviewIssues.length > 0
    };

    if (rule.kind === 'repairMissingSubject') {
      checks.targetMet = Boolean(evidence.primaryAction && subjectLinkedToAction(response, evidence.primaryAction));
    } else if (rule.kind === 'repairMissingPredicate') {
      checks.targetMet = addedFinitePredicate(source, response) && checks.hasIndependentClause;
    } else if (rule.kind === 'attachDependentClause') {
      checks.dependentWordsAttached = dependentWordsAttached(response);
      checks.targetMet = checks.dependentWordsAttached && checks.hasIndependentClause;
    } else if (rule.kind === 'integratePhraseFragment') {
      checks.phraseAttached = meaning.preserved && checks.hasIndependentClause
        && withoutEndPunctuation(source) !== withoutEndPunctuation(response);
      checks.targetMet = checks.phraseAttached;
    } else if (rule.kind === 'writeWithConnector') {
      const requested = String(rule.requestedWord || '').toLowerCase();
      checks.usesRequestedWord = requested
        ? new RegExp(`\\b${requested.replace(' ', '\\s+')}\\b`, 'i').test(response)
        : Boolean(connectorIn(response));
      checks.dependentWordsAttached = dependentWordsAttached(response);
      checks.targetMet = checks.usesRequestedWord && checks.dependentWordsAttached && checks.hasIndependentClause;
    } else if (rule.kind === 'paragraphRepair') {
      paragraphEvaluation(rule, response, checks);
    } else {
      checks.targetMet = false;
      checks.uncertain = checks.nonEmpty && checks.onTask;
    }
    checks.addsMissingPart = checks.targetMet;

    const responseIssues = [
      ...grammar,
      ...contractIssues(rule, response, meaning, sourceContext, responseContext)
    ].filter((entry, index, all) => all.findIndex((candidate) => candidate.code === entry.code) === index);
    const blockingIssues = responseIssues.filter((entry) => entry.severity === 'blocking');
    checks.grammarAcceptable = !blockingIssues.some((entry) => (
      ['REPEATED_WORD', 'INFINITIVE_FORM', 'DO_SUPPORT_FORM', 'MODAL_VERB_FORM',
        'PERFECT_VERB_FORM', 'SUBJECT_VERB_AGREEMENT', 'INAPPROPRIATE_LANGUAGE'].includes(entry.code)
    ));
    checks.responseContractMet = !blockingIssues.some((entry) => (
      ['MULTIPLE_SENTENCES', 'QUESTION_NOT_REQUESTED', 'POLARITY_CHANGED',
        'MODALITY_CHANGED', 'TENSE_CHANGED', 'REQUIRED_CONNECTOR_REMOVED'].includes(entry.code)
    ));

    const requiredChecks = rule.requiredChecks || [];
    const failedRequired = requiredChecks.filter((name) => !checks[name]);
    const onlyUncertain = checks.uncertain && failedRequired.length === 0 && blockingIssues.length === 0;
    let status = 'correct';
    if (!checks.nonEmpty || !checks.onTask || failedRequired.length || blockingIssues.length) status = 'incorrect';
    else if (onlyUncertain || rule.kind === 'genericRepair') status = 'needsReview';

    const strategy = repairStrategy(rule, response, checks, evidence);
    const misconceptionEvidence = targetEvidence(rule, checks, strategy);
    const reasons = responseIssues.filter((entry) => entry.severity !== 'advisory').map((entry) => entry.message);
    if (!checks.targetMet && !reasons.includes(targetRetry(rule.kind))) reasons.unshift(targetRetry(rule.kind));
    if (status === 'needsReview' && !reasons.length) reasons.push('A structured follow-up is needed to confirm the skill.');

    return {
      status,
      taskCorrect: status === 'correct',
      score: status === 'correct' ? 1 : 0,
      confidence: status === 'needsReview' ? 'low' : 'high',
      evaluatorVersion: rulesPackage.version,
      family: rule.kind,
      repairStrategy: strategy,
      sentenceComplete: checks.hasIndependentClause,
      meaningPreserved: checks.sourceMeaningPreserved,
      target: { tag: rule.targetTag || '', met: checks.targetMet },
      quality: {
        targetMet: checks.targetMet,
        meaningPreserved: checks.sourceMeaningPreserved,
        grammarAcceptable: checks.grammarAcceptable,
        responseContractMet: checks.responseContractMet
      },
      checks,
      misconceptionEvidence,
      responseIssues: responseIssues.filter((entry) => entry.severity !== 'advisory'),
      advisories,
      reasons,
      feedback: chooseFeedback(rule, status, checks, responseIssues, advisories, strategy)
    };
  }

  window.OpenTextEvaluator = {
    version: rulesPackage.version,
    normalizeText,
    tokenize,
    evaluateOpenText,
    helpers: {
      preservationRatio,
      hasSubjectBeforeVerb,
      hasMainVerb,
      hasCompleteThought: hasIndependentClause,
      hasIndependentClause,
      dependentWordsAttached,
      sentenceParts,
      grammarIssues,
      sourceEvidence
    }
  };
})();

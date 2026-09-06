/* Deterministic, browser-local evaluation for constrained writing tasks. */
(function createOpenTextEvaluator() {
  const rulesPackage = window.EVALUATION_RULES || { version: 'missing', items: {} };
  const connectors = [
    'after', 'although', 'as', 'because', 'before', 'even though', 'if',
    'once', 'since', 'though', 'unless', 'until', 'when', 'whenever',
    'whereas', 'while', 'which', 'who', 'whose', 'that'
  ];
  const pronouns = new Set([
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'who', 'someone', 'anyone',
    'everyone', 'nobody', 'this', 'that', 'these', 'those'
  ]);
  const determiners = new Set([
    'a', 'an', 'the', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
    'each', 'every', 'several', 'some', 'many', 'few', 'one', 'two', 'three'
  ]);
  const prepositions = new Set([
    'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around',
    'at', 'before', 'behind', 'below', 'beneath', 'beside', 'between', 'by',
    'during', 'for', 'from', 'in', 'inside', 'into', 'near', 'of', 'off', 'on',
    'over', 'through', 'to', 'toward', 'under', 'until', 'up', 'with', 'within',
    'without'
  ]);
  const stopWords = new Set([
    ...determiners, ...prepositions, 'and', 'or', 'but', 'so', 'yet', 'nor',
    'not', 'very', 'too', 'also', 'then', 'than', 'there', 'here'
  ]);
  const commonVerbs = new Set([
    'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
    'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'shall',
    'should', 'may', 'might', 'must', 'forgot', 'forget', 'left', 'leave',
    'walked', 'walk', 'ran', 'run', 'went', 'go', 'came', 'come', 'made',
    'make', 'took', 'take', 'gave', 'give', 'found', 'find', 'thought',
    'think', 'knew', 'know', 'saw', 'see', 'said', 'say', 'told', 'tell',
    'wrote', 'write', 'read', 'sent', 'send', 'brought', 'bring', 'began',
    'begin', 'became', 'become', 'felt', 'feel', 'kept', 'keep', 'held',
    'hold', 'met', 'meet', 'paid', 'pay', 'stood', 'stand', 'sat', 'sit',
    'lost', 'lose', 'won', 'win', 'fell', 'fall', 'rose', 'rise', 'spoke',
    'speak', 'chose', 'choose', 'drove', 'drive', 'ate', 'eat', 'drank',
    'drink', 'arrived', 'arrive', 'moved', 'move', 'asked', 'ask', 'added',
    'add', 'opened', 'open', 'closed', 'close', 'finished', 'finish',
    'submitted', 'submit', 'completed', 'complete', 'changed', 'change',
    'needed', 'need', 'wanted', 'want', 'worked', 'work', 'called', 'call',
    'looked', 'look', 'used', 'use', 'included', 'include', 'explained',
    'explain', 'showed', 'show', 'provided', 'provide', 'clarified', 'clarify',
    'delayed', 'delay', 'lit', 'greeted', 'greet', 'posted', 'post', 'noticed',
    'notice', 'carried', 'carry', 'decided', 'decide', 'attended', 'attend',
    'returned', 'return', 'repeated', 'repeat', 'remained', 'remain', 'seemed',
    'seem', 'displayed', 'display', 'gathered', 'gather', 'followed', 'follow',
    'divided', 'divide', 'saved', 'save', 'turned', 'turn'
  ]);
  const irregular = {
    forgot: 'forget', forgotten: 'forget', left: 'leave', went: 'go', gone: 'go',
    came: 'come', made: 'make', took: 'take', given: 'give', gave: 'give',
    found: 'find', thought: 'think', knew: 'know', known: 'know', saw: 'see',
    seen: 'see', wrote: 'write', written: 'write', sent: 'send', brought: 'bring',
    began: 'begin', begun: 'begin', became: 'become', felt: 'feel', kept: 'keep',
    held: 'hold', met: 'meet', paid: 'pay', stood: 'stand', sat: 'sit',
    lost: 'lose', won: 'win', fell: 'fall', rose: 'rise', spoke: 'speak',
    chosen: 'choose', chose: 'choose', drove: 'drive', driven: 'drive', ate: 'eat',
    eaten: 'eat', drank: 'drink', drunk: 'drink', were: 'be', was: 'be', is: 'be',
    are: 'be', am: 'be', has: 'have', had: 'have', does: 'do', did: 'do'
  };

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

  function stem(token) {
    const word = String(token || '').toLowerCase().replace(/'s$/, '');
    if (irregular[word]) return irregular[word];
    if (word.length > 5 && word.endsWith('ing')) {
      const root = word.slice(0, -3);
      return /(.)\1$/.test(root) ? root.slice(0, -1) : root;
    }
    if (word.length > 4 && word.endsWith('ied')) return `${word.slice(0, -3)}y`;
    if (word.length > 4 && word.endsWith('ed')) {
      const root = word.slice(0, -2);
      return /(.)\1$/.test(root) ? root.slice(0, -1) : root;
    }
    if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
    if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
    return word;
  }

  function contentStems(value) {
    return tokenize(value)
      .filter((token) => !stopWords.has(token) && token.length > 2)
      .map(stem);
  }

  function preservationRatio(source, response) {
    const sourceTerms = [...new Set(contentStems(source))];
    const responseTerms = new Set(contentStems(response));
    if (!sourceTerms.length) return 1;
    return sourceTerms.filter((term) => responseTerms.has(term)).length / sourceTerms.length;
  }

  function isLikelyVerb(token) {
    const word = String(token || '').toLowerCase();
    return commonVerbs.has(word)
      || commonVerbs.has(stem(word))
      || (word.length > 4 && /ed$/.test(word))
      || (word.length > 4 && /en$/.test(word));
  }

  function hasSubjectBeforeVerb(value) {
    const words = tokenize(value);
    const verbIndex = words.findIndex(isLikelyVerb);
    if (verbIndex < 1) return false;
    const before = words.slice(0, verbIndex);
    if (before.some((word) => pronouns.has(word))) return true;
    if (before.some((word) => determiners.has(word))) return true;
    return before.some((word) => !stopWords.has(word) && !/ing$/.test(word));
  }

  function hasMainVerb(value) {
    return tokenize(value).some(isLikelyVerb);
  }

  function clauseLooksComplete(value) {
    const text = normalizeText(value).replace(/^[,;:\s]+|[,;:\s]+$/g, '');
    if (!text) return false;
    const lower = text.toLowerCase();
    const startsWithConnector = connectors.some((word) => (
      lower === word || lower.startsWith(`${word} `)
    ));
    if (startsWithConnector) return false;
    if (/^(to\s+\w+|\w+ing\b|\w+ed\b)/i.test(text) && !/,/.test(text)) return false;
    return hasSubjectBeforeVerb(text) && hasMainVerb(text);
  }

  function hasCompleteThought(value) {
    const text = normalizeText(value);
    if (!text) return false;
    const parts = text.split(/[;,]/).map((part) => part.trim()).filter(Boolean);
    if (parts.some(clauseLooksComplete)) return true;
    return clauseLooksComplete(text);
  }

  function dependentWordsAttached(value) {
    const text = normalizeText(value);
    const lower = text.toLowerCase();
    const connector = connectors.find((word) => lower === word || lower.startsWith(`${word} `) || lower.includes(` ${word} `));
    if (!connector) return false;
    if (lower.startsWith(`${connector} `)) {
      const comma = text.indexOf(',');
      return comma > -1 && clauseLooksComplete(text.slice(comma + 1));
    }
    const index = lower.indexOf(` ${connector} `);
    return index > 0 && clauseLooksComplete(text.slice(0, index));
  }

  function addedVerb(source, response) {
    const sourceTerms = new Set(tokenize(source).map(stem));
    return tokenize(response).some((token) => isLikelyVerb(token) && !sourceTerms.has(stem(token)));
  }

  function sentenceParts(value) {
    return String(value || '')
      .match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) || [];
  }

  function withoutEndPunctuation(value) {
    return normalizeText(value).replace(/[.!?]+$/g, '').trim().toLowerCase();
  }

  function exactTargetStillStandalone(response, target) {
    const expected = withoutEndPunctuation(target);
    return sentenceParts(response).some((part) => withoutEndPunctuation(part) === expected);
  }

  function baseChecks(rule, response) {
    const source = rule.sourceText || '';
    const normalized = normalizeText(response);
    const sourceNormalized = withoutEndPunctuation(source);
    const responseNormalized = withoutEndPunctuation(normalized);
    const ratio = preservationRatio(source, normalized);
    return {
      nonEmpty: Boolean(normalized),
      preservesSourceContent: source ? ratio >= (rule.kind === 'paragraphRepair' ? 0.68 : 0.55) : true,
      preservationRatio: ratio,
      copiedWithoutRepair: Boolean(sourceNormalized) && sourceNormalized === responseNormalized,
      hasSubject: hasSubjectBeforeVerb(normalized),
      hasMainVerb: hasMainVerb(normalized),
      hasCompleteThought: hasCompleteThought(normalized),
      punctuationIsPlausible: /[.!?]$/.test(normalized),
      introducesMajorConflict: source ? ratio < 0.25 : false,
      uncertain: false
    };
  }

  function reasonFor(check) {
    const reasons = {
      nonEmpty: 'Enter a response before checking your work.',
      preservesSourceContent: 'Keep the original action and key details while making the repair.',
      addsMissingPart: 'The response still needs the missing sentence part.',
      hasSubject: 'Add who or what performs the action.',
      hasMainVerb: 'Add a main verb that tells what the subject does or is.',
      hasCompleteThought: 'Make sure the result expresses a complete thought that can stand alone.',
      dependentWordsAttached: 'Connect the dependent word group to a complete thought.',
      phraseAttached: 'Attach the phrase to a complete sentence.',
      usesRequestedWord: 'Use the word requested in the directions.',
      allTargetsAddressed: 'One or more fragments still stand alone in the paragraph.'
    };
    return reasons[check] || 'Review the requested change and try again.';
  }

  function positiveFeedback(kind) {
    const feedback = {
      repairMissingSubject: 'Your repair adds who or what performs the action and keeps the original idea.',
      repairMissingPredicate: 'Your repair tells what the subject does or is and completes the thought.',
      attachDependentClause: 'Your repair connects the dependent word group to a complete thought.',
      integratePhraseFragment: 'Your repair attaches the phrase to a complete sentence.',
      writeWithConnector: 'Your sentence uses the requested word and includes a complete thought.',
      paragraphRepair: 'Your revision repairs the identified fragments while preserving the paragraph’s meaning.',
      genericRepair: 'Your response makes the requested change and preserves the original idea.'
    };
    return feedback[kind] || feedback.genericRepair;
  }

  function evaluateParagraph(rule, response, checks) {
    const targets = rule.targetFragments || [];
    const allAddressed = targets.every((target) => !exactTargetStillStandalone(response, target));
    const sampleSimilarity = rule.sampleRepair ? preservationRatio(rule.sampleRepair, response) : 0;
    const sentences = sentenceParts(response);
    const completeCount = sentences.filter(hasCompleteThought).length;

    checks.allTargetsAddressed = allAddressed;
    checks.addsMissingPart = allAddressed;
    checks.hasCompleteThought = sentences.length > 0 && completeCount / sentences.length >= 0.7;

    if (sampleSimilarity >= 0.9 && allAddressed) {
      checks.hasCompleteThought = true;
      checks.uncertain = false;
    } else if (allAddressed && checks.preservesSourceContent && !checks.hasCompleteThought) {
      checks.uncertain = true;
    }
  }

  function scoreChecks(checks, requiredChecks) {
    const supporting = ['punctuationIsPlausible'];
    const names = [...requiredChecks, ...supporting];
    return names.filter((name) => checks[name]).length / names.length;
  }

  function evaluateOpenText(item, answer) {
    const rule = item?.evaluation || rulesPackage.items[item?.id];
    const response = typeof answer === 'object' && answer !== null ? answer.text : answer;

    if (!rule) {
      return {
        status: 'needsReview',
        score: 0,
        evaluatorVersion: rulesPackage.version,
        checks: { nonEmpty: Boolean(normalizeText(response)), unknownRule: true },
        reasons: ['This item does not yet have a local evaluation rule.'],
        feedback: 'Your response was saved, but the local checker cannot score this item confidently.'
      };
    }

    const checks = baseChecks(rule, response);
    const normalized = normalizeText(response);
    const source = rule.sourceText || '';

    if (rule.kind === 'repairMissingSubject') {
      checks.addsMissingPart = !checks.copiedWithoutRepair
        && tokenize(normalized).length > tokenize(source).length
        && checks.hasSubject;
    } else if (rule.kind === 'repairMissingPredicate') {
      checks.addsMissingPart = !checks.copiedWithoutRepair && addedVerb(source, normalized);
    } else if (rule.kind === 'attachDependentClause') {
      checks.dependentWordsAttached = dependentWordsAttached(normalized);
      checks.addsMissingPart = !checks.copiedWithoutRepair
        && tokenize(normalized).length > tokenize(source).length
        && checks.dependentWordsAttached;
    } else if (rule.kind === 'integratePhraseFragment') {
      checks.phraseAttached = !checks.copiedWithoutRepair
        && tokenize(normalized).length > tokenize(source).length
        && checks.hasCompleteThought;
      checks.addsMissingPart = checks.phraseAttached;
    } else if (rule.kind === 'writeWithConnector') {
      const requested = String(rule.requestedWord || '').toLowerCase();
      checks.usesRequestedWord = requested
        ? new RegExp(`\\b${requested.replace(' ', '\\s+')}\\b`, 'i').test(normalized)
        : connectors.some((word) => new RegExp(`\\b${word.replace(' ', '\\s+')}\\b`, 'i').test(normalized));
      checks.dependentWordsAttached = dependentWordsAttached(normalized);
      checks.addsMissingPart = checks.usesRequestedWord && checks.dependentWordsAttached;
    } else if (rule.kind === 'paragraphRepair') {
      evaluateParagraph(rule, normalized, checks);
    } else {
      checks.addsMissingPart = !checks.copiedWithoutRepair
        && tokenize(normalized).length > tokenize(source).length;
      checks.uncertain = checks.addsMissingPart && checks.preservesSourceContent;
    }

    const requiredChecks = rule.requiredChecks || [];
    const failedRequired = requiredChecks.filter((name) => !checks[name]);
    let status = 'correct';
    if (!checks.nonEmpty || checks.introducesMajorConflict || failedRequired.length) status = 'incorrect';
    else if (checks.uncertain || rule.kind === 'genericRepair') status = 'needsReview';

    const reasons = failedRequired.map(reasonFor);
    if (checks.introducesMajorConflict && !reasons.includes(reasonFor('preservesSourceContent'))) {
      reasons.push(reasonFor('preservesSourceContent'));
    }
    if (status === 'needsReview') {
      reasons.push('The local checker found a possible repair but cannot judge it confidently.');
    }

    return {
      status,
      score: Number(scoreChecks(checks, requiredChecks).toFixed(2)),
      evaluatorVersion: rulesPackage.version,
      family: rule.kind,
      checks,
      reasons,
      feedback: status === 'correct'
        ? positiveFeedback(rule.kind)
        : reasons[0] || 'Review the requested change and try again.'
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
      hasCompleteThought,
      dependentWordsAttached,
      sentenceParts
    }
  };
})();

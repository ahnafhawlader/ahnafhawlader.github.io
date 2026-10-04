
(function () {
  var intro = document.getElementById('introOverlay');
  if (intro) {
    var reducedIntro = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var introSkip = document.getElementById('introSkip');
    introSkip.focus({ preventScroll: true });
    var introTimer = window.setTimeout(function () { intro.remove(); }, reducedIntro ? 650 : 3700);
    introSkip.addEventListener('click', function () {
      window.clearTimeout(introTimer);
      intro.classList.add('dismissed');
      window.setTimeout(function () { intro.remove(); }, reducedIntro ? 0 : 260);
    });
  }
  var root = document.documentElement;
  var THEMES = ['sakura', 'cyberpunk', 'western', 'moonlit'];

  function getStored() {
    try { return localStorage.getItem('ahnaf-theme'); } catch (e) { return null; }
  }
  function setStored(value) {
    try { localStorage.setItem('ahnaf-theme', value); } catch (e) { /* no-op */ }
  }
  function currentTheme() {
    var stored = getStored();
    return stored && THEMES.indexOf(stored) !== -1 ? stored : 'sakura';
  }
  function markActive(theme) {
    var swatches = document.querySelectorAll('.swatch');
    swatches.forEach(function (s) {
      var active = s.getAttribute('data-theme') === theme;
      s.classList.toggle('active', active);
      s.setAttribute('aria-pressed', String(active));
    });
  }
  var stored = getStored();
  if (stored && THEMES.indexOf(stored) !== -1) root.setAttribute('data-theme', stored);

  window.addEventListener('DOMContentLoaded', function () {
    markActive(currentTheme());
    var mobileMenu = document.querySelector('.mobile-menu');
    if (mobileMenu) mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { mobileMenu.open = false; });
    });
    document.querySelectorAll('.swatch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var theme = btn.getAttribute('data-theme');
        root.setAttribute('data-theme', theme);
        setStored(theme);
        markActive(theme);
        var hero = document.querySelector('.hero');
        if (hero) {
          hero.classList.remove('theme-swap');
          void hero.offsetWidth;
          hero.classList.add('theme-swap');
        }
      });
    });
    var progress = document.getElementById('scrollProgress');
    var backToTop = document.getElementById('backToTop');
    var updateProgress = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var fraction = max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0;
      if (progress) progress.style.transform = 'scaleX(' + fraction + ')';
      if (backToTop) {
        backToTop.style.setProperty('--scroll-turn', (fraction * 360) + 'deg');
        backToTop.classList.toggle('visible', window.scrollY > 500);
      }
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
    if (backToTop) backToTop.addEventListener('click', function () {
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });

    var photoDialog = document.getElementById('photoDialog');
    var photoDialogImage = document.getElementById('photoDialogImage');
    var photoDialogCaption = document.getElementById('photoDialogCaption');
    var lastPhotoButton = null;
    document.querySelectorAll('.gallery-open').forEach(function (button) {
      button.addEventListener('click', function () {
        var figure = button.closest('figure');
        var photo = button.querySelector('img');
        if (!photoDialog || !photo) return;
        lastPhotoButton = button;
        photoDialogImage.src = photo.src;
        photoDialogImage.alt = photo.alt;
        photoDialogCaption.textContent = figure.querySelector('figcaption').textContent;
        photoDialog.showModal();
      });
    });
    var photoClose = document.getElementById('photoClose');
    if (photoClose) photoClose.addEventListener('click', function () { photoDialog.close(); });
    if (photoDialog) {
      photoDialog.addEventListener('click', function (event) {
        if (event.target === photoDialog) photoDialog.close();
      });
      photoDialog.addEventListener('close', function () {
        photoDialogImage.removeAttribute('src');
        if (lastPhotoButton) lastPhotoButton.focus();
      });
    }

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var revealTargets = document.querySelectorAll('.section-head, .about-card, .dream-card, .project-card, .t-item, .skill-group, .edu-card, .interest-card, .gallery-shot, .contact-panel');
    if (!reduceMotion && 'IntersectionObserver' in window) {
      revealTargets.forEach(function (el) { el.classList.add('reveal-ready'); });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px 30px 0px' });
      revealTargets.forEach(function (el) { io.observe(el); });
    }
  });
})();


(function () {
  var TERMS = [
    { name: 'Bridge', icon: '🌉' },
    { name: 'Gear', icon: '⚙️' },
    { name: 'Circuit', icon: '🔌' },
    { name: 'Robot', icon: '🤖' },
    { name: 'Rocket', icon: '🚀' },
    { name: 'Lightbulb', icon: '💡' }
  ];
  var board = document.getElementById('matchBoard');
  var movesEl = document.getElementById('matchMoves');
  var bestEl = document.getElementById('matchBest');
  var statusEl = document.getElementById('matchStatus');
  var resetBtn = document.getElementById('matchReset');
  if (!board) return;

  var first = null, second = null, lock = false, moves = 0, matched = 0, turnTimer = null;
  var best = null;
  try {
    var savedBest = Number(localStorage.getItem('ahnaf-match-best'));
    if (savedBest > 0) best = savedBest;
  } catch (e) { /* storage can be unavailable */ }
  if (bestEl) bestEl.textContent = best === null ? 'None yet' : String(best);

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function buildBoard() {
    if (turnTimer) clearTimeout(turnTimer);
    board.innerHTML = '';
    first = null; second = null; lock = false; moves = 0; matched = 0;
    movesEl.textContent = '0';
    statusEl.textContent = '';
    statusEl.classList.remove('celebrate');
    var deck = shuffle(TERMS.concat(TERMS));
    deck.forEach(function (card) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'match-card';
      el.setAttribute('data-term', card.name);
      el.setAttribute('aria-label', 'Face down card');
      el.innerHTML = '<span class="match-face match-front" aria-hidden="true">?</span><span class="match-face match-back" aria-hidden="true"><span>' + card.icon + '<br>' + card.name + '</span></span>';
      el.addEventListener('click', function () { onFlip(el); });
      board.appendChild(el);
    });
  }

  function onFlip(el) {
    if (lock || el.classList.contains('flipped') || el.classList.contains('done')) return;
    el.classList.add('flipped');
    el.setAttribute('aria-label', el.getAttribute('data-term'));
    if (!first) { first = el; return; }
    second = el;
    lock = true;
    moves++;
    movesEl.textContent = String(moves);
    var isMatch = first.getAttribute('data-term') === second.getAttribute('data-term');
    turnTimer = setTimeout(function () {
      if (isMatch) {
        first.classList.add('done');
        second.classList.add('done');
        first.setAttribute('aria-label', 'Matched ' + first.getAttribute('data-term'));
        second.setAttribute('aria-label', 'Matched ' + second.getAttribute('data-term'));
        matched += 2;
        if (matched === TERMS.length * 2) {
          statusEl.textContent = 'Solved in ' + moves + ' moves! 🎉';
          statusEl.classList.add('celebrate');
          if (best === null || moves < best) {
            best = moves;
            if (bestEl) bestEl.textContent = String(best);
            try { localStorage.setItem('ahnaf-match-best', String(best)); } catch (e) { /* no-op */ }
          }
          document.dispatchEvent(new Event('portfolioCelebrate'));
        }
      } else {
        first.classList.remove('flipped');
        second.classList.remove('flipped');
        first.setAttribute('aria-label', 'Face down card');
        second.setAttribute('aria-label', 'Face down card');
      }
      first = null; second = null; lock = false;
      turnTimer = null;
    }, isMatch ? 350 : 700);
  }

  if (resetBtn) resetBtn.addEventListener('click', buildBoard);
  buildBoard();
})();


(function () {
  var notes = [
    'Big ideas often start with a curious question.',
    'Build, test, learn, and try again.',
    'Every great team has people with different strengths.',
    'A little creativity can change how you see a problem.',
    'Take a break. The next idea might arrive while you play.'
  ];
  var noteIndex = -1;
  var note = document.getElementById('curiosityNote');
  var button = document.getElementById('curiosityButton');
  if (button && note) button.addEventListener('click', function () {
    noteIndex = (noteIndex + 1) % notes.length;
    note.textContent = notes[noteIndex];
  });

  var ideas = {
    mobility: {
      hydrogel: ['Comfort-first prosthetic liner', 'Imagine a soft liner that helps cushion pressure points, making a prosthetic more comfortable to wear.'],
      composite: ['Lightweight mobility frame', 'Imagine a strong, light frame that makes a mobility aid easier to carry and use.'],
      fabric: ['Movement-aware sleeve', 'Imagine a flexible sleeve that tracks motion and helps someone follow their rehabilitation exercises.']
    },
    healing: {
      hydrogel: ['Gentle wound dressing', 'Imagine a moisture-friendly dressing designed to protect a wound as it heals.'],
      composite: ['Protective recovery brace', 'Imagine a light brace that provides support while leaving room for comfortable movement.'],
      fabric: ['Recovery check-in wrap', 'Imagine a soft wrap that helps track movement during physical therapy.']
    },
    sport: {
      hydrogel: ['Cushioned grip concept', 'Imagine a soft, grippy layer that could make training equipment more comfortable to hold.'],
      composite: ['Springy court accessory', 'Imagine a light, durable piece of training equipment built to handle repeated jumps and landings.'],
      fabric: ['Practice feedback sleeve', 'Imagine a wearable sleeve that helps an athlete notice changes in their shooting motion.']
    }
  };
  var selection = { challenge: 'mobility', material: 'hydrogel' };
  var labels = { mobility: 'Mobility', healing: 'Healing', sport: 'Sport', hydrogel: 'hydrogel', composite: 'composite', fabric: 'smart fabric' };
  var labResult = document.getElementById('labResult');
  function renderIdea() {
    var idea = ideas[selection.challenge][selection.material];
    document.getElementById('labCombination').textContent = labels[selection.challenge] + ' + ' + labels[selection.material];
    document.getElementById('labTitle').textContent = idea[0];
    document.getElementById('labDescription').textContent = idea[1];
    document.querySelectorAll('.lab-option').forEach(function (option) {
      option.setAttribute('aria-pressed', String(selection[option.dataset.labKind] === option.dataset.labValue));
    });
    if (labResult) {
      labResult.classList.remove('swap');
      void labResult.offsetWidth;
      labResult.classList.add('swap');
    }
  }
  document.querySelectorAll('.lab-option').forEach(function (option) {
    option.addEventListener('click', function () {
      selection[option.dataset.labKind] = option.dataset.labValue;
      renderIdea();
    });
  });
  var surprise = document.getElementById('labSurprise');
  if (surprise) surprise.addEventListener('click', function () {
    var challenges = Object.keys(ideas);
    var materials = Object.keys(ideas.mobility);
    var choices = [];
    challenges.forEach(function (challenge) {
      materials.forEach(function (material) {
        if (challenge !== selection.challenge || material !== selection.material) choices.push({ challenge: challenge, material: material });
      });
    });
    selection = choices[Math.floor(Math.random() * choices.length)];
    renderIdea();
  });

  var secretButton = document.getElementById('secretButton');
  var secretMessage = document.getElementById('secretMessage');
  if (secretButton && secretMessage) secretButton.addEventListener('click', function () {
    var opening = secretMessage.hidden;
    secretMessage.hidden = !opening;
    secretButton.setAttribute('aria-expanded', String(opening));
    if (opening) celebrate();
  });

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function celebrate() {
    if (reduceMotion) return;
    var symbols = ['✨', '⭐', '🏀', '⚙️'];
    for (var i = 0; i < 18; i++) {
      var piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.setAttribute('aria-hidden', 'true');
      piece.textContent = symbols[i % symbols.length];
      piece.style.setProperty('--x', Math.round(Math.random() * 95) + 'vw');
      piece.style.setProperty('--drift', Math.round(Math.random() * 180 - 90) + 'px');
      piece.style.setProperty('--duration', (2 + Math.random() * 1.3).toFixed(2) + 's');
      document.body.appendChild(piece);
      piece.addEventListener('animationend', function () { this.remove(); });
    }
  }
  document.addEventListener('portfolioCelebrate', celebrate);
})();

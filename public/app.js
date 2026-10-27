const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const dialogs = $$('dialog');
let opener = null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function closeDialog(dialog) {
  dialog.close();
  if (opener?.isConnected) opener.focus({ preventScroll: true });
}
function openDialog(id, trigger = document.activeElement) {
  const dialog = document.getElementById(id);
  if (!dialog) return;
  dialogs.forEach((item) => {
    if (item.open) item.close();
  });
  opener = trigger instanceof HTMLElement ? trigger : null;
  dialog.showModal();
  dialog.scrollTop = 0;
}
for (const dialog of dialogs) {
  $('[data-close]', dialog)?.addEventListener('click', () =>
    closeDialog(dialog),
  );
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      closeDialog(dialog);
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDialog(dialog);
  });
}
$('.menu-button').addEventListener('click', (event) =>
  openDialog('menu-dialog', event.currentTarget),
);
$$('#menu-dialog a').forEach((link) =>
  link.addEventListener('click', () => closeDialog($('#menu-dialog'))),
);
$$('[data-open]').forEach((button) =>
  button.addEventListener('click', () =>
    openDialog(`${button.dataset.open}-dialog`, button),
  ),
);
$('#back-top').addEventListener('click', () =>
  window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' }),
);
$('#year').textContent = String(new Date().getFullYear());

const formats = {
  social: {
    title: 'THE SOCIAL MILES',
    description:
      'An easy, conversational outing built around meeting people. Leave the splits behind and enjoy the streets together.',
    effort: 'Easy & conversational',
    feel: 'Connection over competition',
    recommendation:
      'The Social Miles is your starting line. Keep the effort comfortable enough to chat, and check the published route before you join.',
  },
  distance: {
    title: 'THE LONG WAY ROUND',
    description:
      'A steady run for the days you want to explore a little further. Shared kilometres, a comfortable rhythm and somewhere new around the next corner.',
    effort: 'Steady & sustained',
    feel: 'A little more exploration',
    recommendation:
      'The Long Way Round could be your rhythm. Pick a confirmed distance you already feel comfortable with, and leave space to enjoy the journey.',
  },
  training: {
    title: 'PICK UP THE PACE',
    description:
      'A focused format for runners who enjoy a little structure. Build rhythm through shared effort, with the session details set by the run lead.',
    effort: 'Structured & focused',
    feel: 'Progress at your own pace',
    recommendation:
      'Pick Up The Pace sounds like your next move. Check the published session and recovery intervals, and work at an effort that suits you.',
  },
};
let selectedFormat = 'social';
const validFilters = ['all', 'social', 'distance', 'training'];
function setFilter(value, updateUrl = true) {
  const filter = validFilters.includes(value) ? value : 'all';
  $$('[data-filter]').forEach((button) =>
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.filter === filter),
    ),
  );
  $$('.run-card').forEach((card) => {
    card.hidden = filter !== 'all' && card.dataset.type !== filter;
  });
  $('#filter-status').textContent =
    filter === 'all'
      ? 'Showing all three run formats.'
      : `Showing ${filter} runs.`;
  if (updateUrl) {
    const url = new URL(location.href);
    if (filter === 'all') url.searchParams.delete('run');
    else url.searchParams.set('run', filter);
    history.replaceState(null, '', url);
  }
}
$$('[data-filter]').forEach((button) =>
  button.addEventListener('click', () => setFilter(button.dataset.filter)),
);
setFilter(new URL(location.href).searchParams.get('run') ?? 'all', false);
window.addEventListener('popstate', () =>
  setFilter(new URL(location.href).searchParams.get('run') ?? 'all', false),
);
$$('[data-run]').forEach((button) =>
  button.addEventListener('click', () => {
    const data = formats[button.dataset.run];
    if (!data) return;
    selectedFormat = button.dataset.run;
    $('#run-title').textContent = data.title;
    $('#run-description').textContent = data.description;
    $('#run-facts').replaceChildren();
    for (const [name, value] of [
      ['The effort', data.effort],
      ['The feeling', data.feel],
      ['Meeting point', 'Published with each event'],
    ]) {
      const div = document.createElement('div'),
        dt = document.createElement('dt'),
        dd = document.createElement('dd');
      dt.textContent = name;
      dd.textContent = value;
      div.append(dt, dd);
      $('#run-facts').append(div);
    }
    openDialog('run-dialog', button);
  }),
);
$('#run-plan').addEventListener('click', () =>
  openDialog('pace-dialog', $$(`[data-run="${selectedFormat}"]`)[0]),
);

$('#pace-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget),
    experience = data.get('experience'),
    goal = data.get('goal');
  selectedFormat =
    experience !== 'regular' || goal === 'people'
      ? 'social'
      : goal === 'explore'
        ? 'distance'
        : 'training';
  $('#pace-result-title').textContent = formats[selectedFormat].title;
  $('#pace-result-copy').textContent = formats[selectedFormat].recommendation;
  $('#pace-form').hidden = true;
  $('#pace-result').hidden = false;
  $('#plan-status').textContent = '';
  $('#pace-result').scrollIntoView({
    behavior: reducedMotion ? 'instant' : 'smooth',
    block: 'nearest',
  });
});
$('#reset-pace').addEventListener('click', () => {
  $('#pace-form').hidden = false;
  $('#pace-result').hidden = true;
  $('#pace-form input').focus();
});
$('#save-plan').addEventListener('click', () => {
  try {
    localStorage.setItem(
      'urc-run-plan-v1',
      JSON.stringify({ format: selectedFormat }),
    );
    $('#plan-status').textContent =
      'Saved on this device only. It’s a plan, not an event registration.';
  } catch {
    $('#plan-status').textContent =
      'Your browser couldn’t save this plan. Your suggestion is still shown above.';
  }
});
$('#clear-plan').addEventListener('click', () => {
  try {
    localStorage.removeItem('urc-run-plan-v1');
    $('#privacy-status').textContent =
      'Your saved plan has been deleted from this browser.';
  } catch {
    $('#privacy-status').textContent = 'Browser storage is unavailable.';
  }
});

const articles = {
  first: {
    category: 'GETTING STARTED · 3 MIN READ',
    title: 'YOUR FIRST CLUB RUN. ZERO OVERTHINKING.',
    sections: [
      [
        'The first step is a hello.',
        'Showing up somewhere new can feel bigger than the run itself. Give yourself a little extra time. Find the run lead, say it’s your first session, and ask where the group will finish. You don’t need a running résumé.',
      ],
      [
        'Choose the conversation.',
        'Start with a social outing and a distance you already find comfortable. Running with a club isn’t a test. If you can enjoy a conversation, you’re leaving room to notice the people and the place around you.',
      ],
      [
        'Know the plan.',
        'Read the confirmed meeting point, route, pace and any requirements before you travel. Tell the run lead if you need to leave early. If a session isn’t published yet, wait for the details instead of guessing.',
      ],
      [
        'A good finish.',
        'Take a few easy minutes after the run. Have some water. Remember a name. The next time you show up, that first hello might already be waiting for you.',
      ],
    ],
  },
  kit: {
    category: 'THE ESSENTIALS · 2 MIN READ',
    title: 'A GOOD RUN STARTS WITH THE BASICS.',
    sections: [
      [
        'Keep it comfortable.',
        'Wear shoes and clothing you’ve already tried on an easy run. A club session doesn’t need to be the day you test something completely new.',
      ],
      [
        'Your simple checklist.',
        [
          'Comfortable running shoes and weather-ready layers.',
          'Water, with more planned for warm conditions or longer outings.',
          'A charged phone and a way to get home.',
          'Any personal essentials you normally carry.',
          'The confirmed event details, meeting point and run lead’s instructions.',
        ],
      ],
      [
        'Check the conditions.',
        'Look at the weather and daylight before leaving. Be visible around traffic, follow local road rules and adapt your plans if conditions don’t feel right.',
      ],
      [
        'Leave room to enjoy it.',
        'A lighter bag and a familiar routine make it easier to be present. The most useful thing you can bring is a little attention to yourself and the people around you.',
      ],
    ],
  },
  together: {
    category: 'THE CLUB MINDSET · 2 MIN READ',
    title: 'BETTER TOGETHER. ONE KILOMETRE AT A TIME.',
    sections: [
      [
        'Find a shared rhythm.',
        'Not everyone arrives with the same pace or the same day behind them. A good group starts by agreeing on the plan, listening to the run lead and respecting the effort each person brings.',
      ],
      [
        'Make some room.',
        'Keep paths open for other people, give space at crossings and call out a hazard clearly. A run club shares the city with everyone else who uses it.',
      ],
      [
        'Progress is personal.',
        'Some days the win is a faster finish. Other days it’s getting out the door. Both count as showing up. Let comparison take a rest.',
      ],
      [
        'Carry the feeling forward.',
        'Learn a name. Welcome someone new. Share a little encouragement. The miles are the reason we meet; those small moments are what make it a community.',
      ],
    ],
  },
};
$$('[data-article]').forEach((button) =>
  button.addEventListener('click', () => {
    const article = articles[button.dataset.article];
    if (!article) return;
    $('#article-category').textContent = article.category;
    $('#article-title').textContent = article.title;
    $('#article-body').replaceChildren();
    for (const [heading, copy] of article.sections) {
      const h = document.createElement('h3');
      h.textContent = heading;
      $('#article-body').append(h);
      if (Array.isArray(copy)) {
        const list = document.createElement('ul');
        for (const item of copy) {
          const li = document.createElement('li');
          li.textContent = item;
          list.append(li);
        }
        $('#article-body').append(list);
      } else {
        const p = document.createElement('p');
        p.textContent = copy;
        $('#article-body').append(p);
      }
    }
    openDialog('article-dialog', button);
  }),
);

function safeExternal(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
async function configureClub() {
  try {
    const response = await fetch('/club.json');
    if (!response.ok) throw Error('Club details unavailable');
    const club = await response.json();
    if (club.city) {
      $('#join-location').textContent = String(club.city).toUpperCase();
      $('#location-answer').textContent =
        `We’re based in ${club.city}. Our first meeting points and schedule are being confirmed. Each published event will include its exact location, time and route. Please wait for a confirmed event before travelling.`;
    }
    const link = safeExternal(club.joinUrl);
    if (link) {
      $('#join-link').href = link;
      $('#join-link').target = '_blank';
      $('#join-link').rel = 'noopener noreferrer';
      $('#join-link').firstChild.textContent = 'Join the crew ';
      $('#join-note').textContent = 'Registration opens in a new tab.';
    }
    if (Array.isArray(club.events) && club.events.length) {
      const confirmed = club.events.filter(
        (event) =>
          event &&
          typeof event.title === 'string' &&
          typeof event.location === 'string' &&
          Number.isFinite(Date.parse(event.date)) &&
          Date.parse(event.date) > Date.now() &&
          safeExternal(event.joinUrl),
      );
      if (confirmed.length) {
        $('#schedule-message').textContent =
          'Your next meetup. Confirmed and ready for the crew.';
        const target = $('#confirmed-events');
        for (const event of confirmed) {
          const row = document.createElement('article'),
            copy = document.createElement('div'),
            title = document.createElement('h3'),
            date = document.createElement('p'),
            link = document.createElement('a');
          row.className = 'event-row';
          title.textContent = event.title;
          date.textContent =
            new Intl.DateTimeFormat('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Africa/Harare',
            }).format(new Date(event.date)) +
            ' CAT · ' +
            event.location;
          link.className = 'button button-dark';
          link.textContent = 'View event ↗';
          link.href = safeExternal(event.joinUrl);
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          copy.append(title, date);
          row.append(copy, link);
          target.append(row);
        }
      }
    }
  } catch {
    /* Core content and honest coming-soon state remain usable offline. */
  }
}
configureClub();

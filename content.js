// Extract profile name, headline, company, location from LinkedIn profile page DOM.
// LinkedIn uses various selectors; we try several common ones.

function getText(el) {
  if (!el) return '';
  const t = (el.textContent || '').trim();
  return t;
}

// Keep only company name; strip " · Full-time", " · Part-time", duplicates, etc.
function cleanCompanyText(text) {
  if (!text || !text.trim()) return '';
  const t = text.trim();
  const idx = t.indexOf(' · ');
  if (idx > -1) return t.substring(0, idx).trim();
  return t;
}

// Reject text that is employment duration (e.g. "Sep 2012 - Present · 13 yrs 6 mos")
function looksLikeDuration(text) {
  if (!text || text.length > 80) return true;
  const t = text.toLowerCase();
  if (/\d+\s*(yrs?|mos?|years?|months?)\b/.test(t)) return true;
  if (/\b(present|·)\s*\d/.test(t) || /\d\s*-\s*present/i.test(t)) return true;
  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d{4}\s*-/i.test(t)) return true;
  if (/^\d{1,2}\s*(yrs?|mos?)\s*$/i.test(t)) return true;
  return false;
}

function extractProfileData() {
  const data = {
    name: '',
    profileUrl: window.location.href,
    jobTitle: '',
    company: '',
    location: ''
  };

  // Name selectors (intro section)
  const nameSelectors = [
    'h1.text-heading-xlarge',
    'h1.inline.t-24',
    '[data-section="headline"] h1',
    '.pv-top-card--list li:first-child',
    '.pv-text-details__left-panel h1',
    'h1'
  ];
  for (const sel of nameSelectors) {
    const el = document.querySelector(sel);
    const text = getText(el);
    if (text && text.length > 1 && !/^linkedin$/i.test(text)) {
      data.name = text;
      break;
    }
  }

  // 1) Try headline first (under the name) - often "Job Title at Company"
  const headlineSelectors = [
    '.pv-text-details__left-panel .text-body-medium',
    '[data-section="headline"] .text-body-medium',
    '.pv-top-card--list-bullet .text-body-medium',
    '.pv-top-card-section__headline',
    '.text-body-medium.inline',
    'div.ph5 .text-body-medium',
    '.pv-top-card-section__headline'
  ];
  let headline = '';
  for (const sel of headlineSelectors) {
    const el = document.querySelector(sel);
    headline = getText(el);
    if (headline && headline.length > 1 && !/^linkedin$/i.test(headline)) break;
    headline = '';
  }
  if (headline) {
    const atIndex = headline.indexOf(' at ');
    if (atIndex > -1) {
      data.jobTitle = headline.substring(0, atIndex).trim();
      data.company = cleanCompanyText(headline.substring(atIndex + 4));
    } else {
      data.jobTitle = headline;
    }
  }

  // 2) Experience section: use most recent experience to fill or override
  function findSectionByHeading(text) {
    const all = document.querySelectorAll('h2, h3, span, div[class*="section-header"]');
    for (const el of all) {
      if (getText(el).trim().toLowerCase() === text.toLowerCase()) {
        let section = el.closest('section') || el.parentElement;
        for (let i = 0; i < 5 && section; i++) {
          if (section.querySelector('ul li, [class*="list"] > div, [class*="experience"]')) break;
          section = section.parentElement;
        }
        return section;
      }
    }
    return null;
  }

  const experienceSectionSelectors = [
    '#experience',
    '[data-section="experience"]',
    'section[aria-label="Experience"]',
    '[id*="experience"]',
    '.pv-profile-section.experience-section',
    'section.experience'
  ];
  let section = findSectionByHeading('Experience');
  if (!section) {
    for (const sel of experienceSectionSelectors) {
      section = document.querySelector(sel);
      if (section) break;
    }
  }

  let firstExperienceEl = null;
  if (section) {
    firstExperienceEl = section.querySelector(
      '.pv-entity__summary-info, .pv-entity__summary-info-v2, .pv-profile-section__list-item, li.pv-entity, .experience-item, .scaffold-layout__list-item'
    ) || section.querySelector('ul.pv-profile-section__list > li') || section.querySelector('ul li') || section.querySelector('[class*="list"] > div');
  }

  if (firstExperienceEl) {
    // Job title: structure is div.t-bold or .hoverable-link-text > span[aria-hidden="true"]
    const titleSelectors = [
      '.hoverable-link-text span[aria-hidden="true"]',
      '.t-bold span[aria-hidden="true"]',
      '.pv-entity__summary-title a', '.pv-entity__summary-title', 'h3.t-16 a', 'h3.t-16',
      'h3[aria-hidden="true"]', '.t-16.t-bold', 'span[aria-hidden="true"]',
      '.experience-item__title', 'h3', '[class*="title"] a', 'a[href*="/title/"]'
    ];
    for (const sel of titleSelectors) {
      const el = firstExperienceEl.querySelector(sel);
      const text = getText(el);
      if (text && text.length > 1 && text.length < 200 && !/^linkedin$/i.test(text)) {
        data.jobTitle = text;
        break;
      }
    }
    // Company: structure is span.t-14.t-normal > span[aria-hidden="true"] (e.g. "HackerRank")
    const companySpans = firstExperienceEl.querySelectorAll('span.t-14.t-normal span[aria-hidden="true"], span.t-14.t-normal');
    for (const el of companySpans) {
      const text = getText(el);
      if (text && text.length > 1 && text.length < 200 && !/^linkedin$/i.test(text) && !looksLikeDuration(text)) {
        data.company = cleanCompanyText(text);
        break;
      }
    }
    if (!data.company) {
      const companyLink = firstExperienceEl.querySelector('a[href*="/company/"]');
      if (companyLink) {
        const text = getText(companyLink);
        if (text && text.length > 1 && text.length < 200 && !looksLikeDuration(text)) {
          data.company = cleanCompanyText(text);
        }
      }
    }
    if (!data.company) {
      const companySelectors = [
        '.pv-entity__summary-subtitle a', '.pv-entity__summary-subtitle',
        '.pv-entity__secondary-title a', '.pv-entity__secondary-title',
        '.pv-entity__company-summary-info h3', '.experience-item__subtitle'
      ];
      for (const sel of companySelectors) {
        const el = firstExperienceEl.querySelector(sel);
        const text = getText(el);
        if (text && text.length > 1 && text.length < 200 && !/^linkedin$/i.test(text) && !looksLikeDuration(text)) {
          data.company = cleanCompanyText(text);
          break;
        }
      }
    }
  }

  // Location
  const locationSelectors = [
    '.pv-text-details__left-panel .text-body-small',
    '[data-section="location"] .text-body-small',
    '.pv-top-card--list-bullet .text-body-small',
    '.pv-top-card-section__location',
    'span.text-body-small.inline.t-black--light'
  ];
  for (const sel of locationSelectors) {
    const el = document.querySelector(sel);
    const text = getText(el);
    if (text && text.length > 1 && !/^linkedin$/i.test(text)) {
      data.location = text;
      break;
    }
  }

  return data;
}

// Debug: see what LinkedIn actually displays in the Experience section
function getExperienceDebugInfo() {
  function findSectionByHeading(text) {
    const all = document.querySelectorAll('h2, h3, span, div[class*="section-header"]');
    for (const el of all) {
      if (getText(el).trim().toLowerCase() === text.toLowerCase()) {
        let section = el.closest('section') || el.parentElement;
        for (let i = 0; i < 5 && section; i++) {
          if (section.querySelector('ul li, [class*="list"] > div, [class*="experience"]')) break;
          section = section.parentElement;
        }
        return section;
      }
    }
    return null;
  }
  let section = findSectionByHeading('Experience');
  if (!section) {
    for (const sel of ['#experience', '[data-section="experience"]', 'section[aria-label="Experience"]', '[id*="experience"]']) {
      section = document.querySelector(sel);
      if (section) break;
    }
  }
  const firstItem = section ? (section.querySelector('.pv-entity__summary-info, .pv-entity__summary-info-v2, .pv-profile-section__list-item, li.pv-entity, .scaffold-layout__list-item') || section.querySelector('ul li') || section.querySelector('[class*="list"] > div')) : null;

  const out = {
    foundSection: !!section,
    foundFirstItem: !!firstItem,
    firstItemHtml: firstItem ? firstItem.outerHTML.substring(0, 6000) : null,
    linksInFirstItem: [],
    allSpansWithText: [],
    headlineText: ''
  };

  if (firstItem) {
    firstItem.querySelectorAll('a[href]').forEach(a => {
      out.linksInFirstItem.push({ href: a.getAttribute('href'), text: getText(a) });
    });
    firstItem.querySelectorAll('span, div').forEach(el => {
      const t = getText(el);
      if (t && t.length > 0 && t.length < 300) {
        const cls = (el.className && typeof el.className === 'string') ? el.className : '';
        out.allSpansWithText.push({ tag: el.tagName, class: cls.substring(0, 80), text: t.substring(0, 150) });
      }
    });
  }

  const headlineEl = document.querySelector('.pv-text-details__left-panel .text-body-medium, [data-section="headline"] .text-body-medium, .text-body-medium.inline');
  out.headlineText = headlineEl ? getText(headlineEl) : '';

  console.log('[LinkedIn Extension DEBUG] Experience section:', out);
  return out;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'getProfileData') {
    sendResponse(extractProfileData());
  } else if (request.action === 'debugExperience') {
    sendResponse(getExperienceDebugInfo());
  }
  return true;
});

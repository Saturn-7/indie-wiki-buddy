const LANGS = ["DE", "EN", "ES", "FR", "IT", "KO", "PL", "PT", "RU", "TOK", "UK", "ZH"];
const breezewikiRegex = /breezewiki\.com$|breeze\.hostux\.net$|bw\.projectsegfau\.lt$|antifandom\.com$|breezewiki\.pussthecat\.org$|bw\.vern\.cc$|breezewiki\.esmailelbob\.xyz$|bw\.artemislena\.eu$|bw\.hamstro\.dev$|nerd\.whatever\.social$|breeze\.nohost\.network$|breeze\.whateveritworks\.org$/;
const currentURL = new URL(document.location);

// Create object prototypes for getting and setting attributes:
Object.prototype.get = function (prop) {
  this[prop] = this[prop] || {};
  return this[prop];
};
Object.prototype.set = function (prop, value) {
  this[prop] = value;
}

// Load website data:
async function getData() {
  let sites = [];
  let promises = [];
  for (let i = 0; i < LANGS.length; i++) {
    promises.push(fetch(chrome.runtime.getURL('data/sites' + LANGS[i] + '.json'))
      .then((resp) => resp.json())
      .then((jsonData) => {
        jsonData.forEach((site) => {
          site.origins.forEach((origin) => {
            sites.push({
              "id": site.id,
              "origin": origin.origin,
              "origin_base_url": origin.origin_base_url,
              "origin_content_path": origin.origin_content_path,
              "origin_main_page": origin.origin_main_page,
              "destination": site.destination,
              "destination_base_url": site.destination_base_url,
              "destination_search_path": site.destination_search_path,
              "destination_content_prefix": (site.destination_content_prefix ? site.destination_content_prefix : ""),
              "destination_platform": site.destination_platform,
              "destination_icon": site.destination_icon,
              "destination_main_page": site.destination_main_page,
              "lang": LANGS[i],
              "tags": site.tags || []
            })
          })
        });
      }));
  }
  await Promise.all(promises);
  return sites;
}

function displayRedirectBanner(newUrl, id, destinationName, destinationLanguage, tags, storage) {
  // Output CSS
  styleString = `
    #indie-wiki-banner {
      font-family: sans-serif;
      width: 100%;
      z-index: 2147483647;
      position: sticky;
      top: 0;
      text-align: center;
      background-color: #acdae2;
      padding: 8px 10px;
    }
    #indie-wiki-banner-exit {
      float: right;
      font-size: 20px;
      color: #333;
      cursor: pointer;
    }
    #indie-wiki-banner-controls {
      padding-bottom: 5px;
    }
    .indie-wiki-banner-big-text {
      font-size: 14px;
      line-height: 24px;
      margin-top: 5px;
    }
    .indie-wiki-banner-link {
      font-size: 16px;
      font-weight: 600;
      color: #000080;
      cursor: pointer;
      padding: 0 10px;
      display: block;
      width: fit-content;
      margin: 0 auto;
    }
    .indie-wiki-banner-link:hover {
      text-decoration: underline;
      color: #000080;
    }
    .indie-wiki-banner-link-small {
      display: inline-block;
      font-size: 12px;
      min-width: 180px;
    }
    .indie-wiki-banner-disabled {
      color: #333;
      cursor: default;
    }
    .indie-wiki-banner-disabled:hover {
      text-decoration: none;
    }
    .indie-wiki-banner-hidden {
      display: none;
    }
  `
  style = document.createElement('style');
  style.textContent = styleString;
  document.head.append(style);

  // Output banner
  let banner = document.createElement('div');
  banner.id = 'indie-wiki-banner';
  let bannerExit = document.createElement('div');
  bannerExit.id = 'indie-wiki-banner-exit';
  banner.appendChild(bannerExit);
  bannerExit.textContent = '✕';
  bannerExit.onclick = function () { this.parentElement.remove(); };

  // Output control links container
  let bannerControls = document.createElement('div');
  bannerControls.id = 'indie-wiki-banner-controls';
  banner.appendChild(bannerControls);

  // Output "restore banner" link
  let bannerRestoreLink = document.createElement('div');
  bannerRestoreLink.id = 'indie-wiki-banner-restore';
  bannerRestoreLink.classList.add('indie-wiki-banner-link');
  bannerRestoreLink.classList.add('indie-wiki-banner-link-small');
  bannerRestoreLink.classList.add('indie-wiki-banner-hidden');
  bannerRestoreLink.textContent = '⎌ Restore banner';
  bannerControls.appendChild(bannerRestoreLink);
  bannerRestoreLink.onclick = function (e) {
    chrome.storage.sync.get({ 'wikiSettings': {} }, (response) => {
      response.wikiSettings.set(id, 'alert');
      chrome.storage.sync.set({ 'wikiSettings': response.wikiSettings });
      e.target.textContent = '✓ Banner restored';
      e.target.classList.add('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-redirect').textContent = '↪ Auto redirect this wiki';
      document.getElementById('indie-wiki-banner-redirect').classList.remove('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-disable').textContent = '✕ Disable banner for this wiki';
      document.getElementById('indie-wiki-banner-disable').classList.remove('indie-wiki-banner-disabled');
    });
  }

  // Output "disable banner" link
  let bannerDisableLink = document.createElement('div');
  bannerDisableLink.id = 'indie-wiki-banner-disable';
  bannerDisableLink.classList.add('indie-wiki-banner-link');
  bannerDisableLink.classList.add('indie-wiki-banner-link-small');
  bannerDisableLink.textContent = '✕ Disable banner for this wiki';
  bannerControls.appendChild(bannerDisableLink);
  bannerDisableLink.onclick = function (e) {
    chrome.storage.sync.get({ 'wikiSettings': {} }, (response) => {
      response.wikiSettings.set(id, 'disabled');
      chrome.storage.sync.set({ 'wikiSettings': response.wikiSettings });
      e.target.textContent = '✓ Banner disabled';
      e.target.classList.add('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-redirect').textContent = '↪ Auto redirect this wiki';
      document.getElementById('indie-wiki-banner-redirect').classList.remove('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-restore').textContent = '⎌ Restore banner';
      document.getElementById('indie-wiki-banner-restore').classList.remove('indie-wiki-banner-hidden');
      document.getElementById('indie-wiki-banner-restore').classList.remove('indie-wiki-banner-disabled');
    });
  }

  // Output "auto redirect" link
  let bannerRedirectLink = document.createElement('div');
  bannerRedirectLink.id = 'indie-wiki-banner-redirect';
  bannerRedirectLink.classList.add('indie-wiki-banner-link');
  bannerRedirectLink.classList.add('indie-wiki-banner-link-small');
  bannerRedirectLink.textContent = '↪ Auto redirect this wiki';
  bannerControls.appendChild(bannerRedirectLink);
  bannerRedirectLink.onclick = function (e) {
    chrome.storage.sync.get({ 'wikiSettings': {} }, (response) => {
      response.wikiSettings.set(id, 'redirect');
      chrome.storage.sync.set({ 'wikiSettings': response.wikiSettings });
      e.target.textContent = '✓ Redirect enabled';
      e.target.classList.add('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-disable').textContent = '✕ Disable banner for this wiki';
      document.getElementById('indie-wiki-banner-disable').classList.remove('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-restore').textContent = '⎌ Restore banner';
      document.getElementById('indie-wiki-banner-restore').classList.remove('indie-wiki-banner-hidden');
      document.getElementById('indie-wiki-banner-restore').classList.remove('indie-wiki-banner-disabled');
    });
  }

  // Output main banner text
  let bannerText = document.createElement('span');
  bannerText.classList.add('indie-wiki-banner-big-text');
  banner.appendChild(bannerText);
  
  // Build descriptor
  let descriptor = 'an independent';
  if (tags.includes('wiki.gg')) {
    descriptor = 'a wiki.gg';
  }
  if (tags.includes('official')) {
    descriptor = 'an official ' + descriptor.split(" ").slice(-1);
  }

  if (destinationLanguage === 'EN' && location.href.match(/fandom\.com\/[a-z]{2}\/wiki\//)) {
    bannerText.textContent = 'There is ' + descriptor + ' wiki covering this topic in English!';
  } else {
    bannerText.textContent = 'There is ' + descriptor + ' wiki covering this topic!';
  }
  let bannerWikiLink = document.createElement('a');
  bannerWikiLink.classList.add('indie-wiki-banner-link');
  bannerText.appendChild(bannerWikiLink);
  bannerWikiLink.href = newUrl;
  bannerWikiLink.textContent = 'Visit ' + destinationName + ' →';

  // Function to insert banner into DOM before body element
  function addBannerToDOM() {
    // Check if document is in a ready state
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      // Ensure banner isn't already outputted
      if (!document.querySelector(':root > #indie-wiki-banner')) {
        document.body.insertAdjacentElement('beforeBegin', banner);
        // Increment banner count
        if (storage.breezewiki === 'on') {
          if (currentURL.hostname.match(breezewikiRegex) || (storage.breezewikiHost === 'CUSTOM' && storage.breezewikiCustomHost?.includes(currentURL.hostname))) {
            chrome.storage.sync.set({ 'countAlerts': (storage.countAlerts ?? 0) + 1 });
          }
        } else {
          chrome.storage.sync.set({ 'countAlerts': (storage.countAlerts ?? 0) + 1 });
        }
      }

      // Remove readystatechange listener
      document.removeEventListener('readystatechange', addBannerToDOM);
    }
  }

  document.addEventListener('readystatechange', addBannerToDOM);
  addBannerToDOM();
}

function main() {
  chrome.storage.local.get((localStorage) => {
    chrome.storage.sync.get((syncStorage) => {
      const storage = { ...syncStorage, ...localStorage };
      // Check if extension is on:
      if ((storage.power ?? 'on') === 'on') {
        // Check if there is a pathname, to ensure we're looking at an article
        if (currentURL.pathname.length > 1) {
          let origin = currentURL;
          // If on a BreezeWiki site, convert to Fandom link to match with our list of wikis:
          if (currentURL.hostname.match(breezewikiRegex) || (storage.breezewikiHost === 'CUSTOM' && storage.breezewikiCustomHost?.includes(currentURL.hostname))) {
            origin = String(currentURL.pathname).split('/')[1] + '.fandom.com/wiki/';
            if (currentURL.search.includes('?q=')) {
              origin = origin + currentURL.search.substring(3).split('&')[0];
            } else {
              origin = origin + currentURL.pathname.split('/')[3];
            }
          }
          getData().then(sites => {
            let crossLanguageSetting = storage.crossLanguage || 'off';
            // Check if site is in our list of wikis:
            // let matchingSites = sites.filter(el => String(origin).replace(/^https?:\/\//, '').startsWith(el.origin_base_url));
            let matchingSites = [];
            if (crossLanguageSetting === 'on') {
              matchingSites = sites.filter(el => String(origin).replace(/^https?:\/\//, '').startsWith(el.origin_base_url));
            } else {
              matchingSites = sites.filter(el => String(origin).replace(/^https?:\/\//, '').startsWith(el.origin_base_url + el.origin_content_path));
            }
            if (matchingSites.length > 0) {
              // Select match with longest base URL 
              let closestMatch = '';
              matchingSites.forEach(site => {
                if (site.origin_base_url.length > closestMatch.length) {
                  closestMatch = site.origin_base_url;
                }
              });
              let site = matchingSites.find(site => site.origin_base_url === closestMatch);
              if (site) {
                // Get user's settings for the wiki
                let id = site['id'];
                let siteSetting = 'alert';
                if (storage.wikiSettings && storage.wikiSettings[id]) {
                  siteSetting = storage.wikiSettings[id];
                } else if (storage.defaultWikiAction) {
                  siteSetting = storage.defaultWikiAction;
                }
                // Notify if enabled for the wiki:
                if (siteSetting === 'alert') {
                  // Get article name from the end of the URL;
                  // We can't just take the last part of the path due to subpages;
                  // Instead, we take everything after the wiki's base URL + content path:
                  let article = decodeURIComponent(String(origin).split(site['origin_base_url'] + site['origin_content_path'])[1] || '');
                  // Set up URL to redirect user to based on wiki platform:
                  let newURL = '';
                  if (article) {
                    // Check if main page
                    if (article === site['origin_main_page']) {
                      article = site['destination_main_page'];
                    }

                    // Replace underscores with spaces as that performs better in search
                    article = article.replaceAll('_', ' ');

                    let searchParams = '';
                    switch (site['destination_platform']) {
                      case 'mediawiki':
                        searchParams = '?search=' + site['destination_content_prefix'] + article;
                        break;
                      case 'doku':
                        searchParams = 'start?do=search&q=' + article;
                        break;
                    }
                    newURL = 'https://' + site["destination_base_url"] + site["destination_search_path"] + searchParams.replaceAll('+', '_');
                    // We replace plus signs with underscores since Fextralife uses pluses instead of spaces/underscores
                  } else {
                    newURL = 'https://' + site["destination_base_url"];
                  }
                  // When head elem is loaded, notify that another wiki is available
                  const docObserver = new MutationObserver((mutations, mutationInstance) => {
                    const headElement = document.querySelector('head');
                    if (headElement) {
                      try {
                        displayRedirectBanner(newURL, site['id'], site['destination'], site['lang'], site['tags'], storage);
                      } finally {
                        mutationInstance.disconnect();
                      }
                    }
                  });
                  docObserver.observe(document, {
                    childList: true,
                    subtree: true
                  });
                }
              }
            }
          });
        }
      }
    });
  });
}

main();
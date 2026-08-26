# Creata OSINT Marketing Pipeline

## The Vision: From Social Handle to Full Contact Profile

Creata finds leads on social media. The OSINT layer turns every lead into a
complete sales-ready profile — cross-platform accounts, email, phone, business
connections, and public footprint — all with **zero paid API keys**.

---

## Why NOT theHarvester (at the start)

theHarvester is a **domain-to-email** tool:
```
nike.com → jane@nike.com, bob@nike.com
```

Creata's use case is **name-to-profile**:
```
"jane_doe_art" (TikTok) → LinkedIn, Twitter, GitHub, email, phone, website
```

theHarvester can't do this efficiently. Wrong tool for step 1. But it has a
place **after** Sherlock finds the domain — see Section 2 below.

---

## Recommended Stack (100% Free & Open Source)

### 1. Sherlock — The Core Engine

**What it does:** Takes one username/handle and checks 400+ platforms for
matching accounts.

| Feature | Detail |
|---------|--------|
| Repo | https://github.com/sherlock-project/sherlock |
| Install | `pip install sherlock` |
| API keys | None — zero cost |
| Speed | ~10 seconds per username |
| Platforms | LinkedIn, Twitter/X, GitHub, Reddit, YouTube, Patreon, Telegram, Snapchat, Pinterest, Medium, Dev.to, Twitch, Tumblr, WordPress, and 400+ more |

**Output example:**
```json
{
  "jane_doe_art": {
    "LinkedIn": "https://linkedin.com/in/janedoe",
    "Twitter": "https://twitter.com/janedoe",
    "GitHub": "https://github.com/janedoe",
    "YouTube": "https://youtube.com/@janedoe",
    "Medium": "https://medium.com/@janedoe"
  }
}
```

---

### 2. Email Discovery Stack (Zero Paid APIs)

After Sherlock finds their LinkedIn/website/domain, extract the email.
All tools below are **free and open source**.

#### A. theHarvester — Domain → Email

Only useful **after** Sherlock found their domain.

```bash
pip install theHarvester
theHarvester -d janedoe.com -b google,linkedin,bing -l 50
```

Returns: `jane@janedoe.com, support@janedoe.com`

| Feature | Detail |
|---------|--------|
| Repo | https://github.com/laramies/theHarvester |
| Cost | Free |
| Use case | Sherlock found janedoe.com → theHarvester extracts @janedoe.com emails |

#### B. Google Dorking — Name/Handle → Email

No API key. Scriptable with `googlesearch-python`:

```python
from googlesearch import search

queries = [
    f'site:linkedin.com/in "jane doe" email',
    f'"@janedoe.com" OR "janedoe@gmail"',
    f'"jane doe" "email" contact',
    f'"jane_doe_art" contact',
]
for q in queries:
    for url in search(q, num=10):
        # scrape each page for email regex pattern
        print(q, url)
```

| Feature | Detail |
|---------|--------|
| Tool | `pip install googlesearch-python` |
| Cost | Free (add user-agent rotation for volume) |
| Use case | Finds emails on public portfolios, business listings, forums, LinkedIn |

#### C. GitHub Commit Search — Email in Git History

People paste emails in commits. Free via GitHub API:

```bash
# Search for commits referencing a known domain
curl -s "https://api.github.com/search/commits?q=jane@janedoe.com"

# Or find a user's GitHub profile
curl -s "https://api.github.com/users/janedoe"
```

| Feature | Detail |
|---------|--------|
| API | GitHub API (unauthenticated: 60/hr, with token: 5000/hr) |
| Cost | Free with free GitHub token |
| Use case | Finds verified email associated with GitHub commits/profile |

#### D. Regex Page Scrape — The Universal Fallback

If everything above misses, scrape any page Sherlock found:

```python
import re, requests
resp = requests.get("https://janedoe.com/about")
emails = set(re.findall(
    r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
    resp.text
))
```

| Feature | Detail |
|---------|--------|
| Tool | Python stdlib + requests |
| Cost | Free |
| Use case | Page Sherlock found → extract any email pattern |

---

### 3. Holehe — Email Service Discovery

**What it does:** Tells you which services an email is registered on.

| Feature | Detail |
|---------|--------|
| Repo | https://github.com/megadose/holehe |
| Install | `pip install holehe` |
| Cost | Free |
| Use case | After finding email, Holehe confirms if it's on Twitter, Spotify, Amazon, Instagram, etc. |

---

### 4. Google Dorking — Deep Web Recon (Phone + Public Mentions)

**Patterns:**
```
site:linkedin.com/in "jane doe" "tiktok"
"jane doe" phone
"jane doe" contact
intext:"jane_doe_art" phone OR address
```

| Tool | Cost | Notes |
|------|------|-------|
| `googlesearch-python` pip package | Free | Simple Python library |
| Manual dorking | Free | Works without any code |

---

### 5. WHOIS Lookup — Domain Owner Identity

Free alternatives to Whoxy:

```bash
# whois CLI (bundled on most Linux distros)
whois janedoe.com

# python-whois library
pip install python-whois
python -c "import whois; print(whois.whois('janedoe.com'))"
```

| Tool | Cost | Notes |
|------|------|-------|
| `whois` CLI | Free | Bundled on Linux/macOS |
| `python-whois` | Free | Pip-installable |
| Whoxy | ~$30/mo | Paid alternative (not needed) |

---

## The Complete Pipeline

```
                    ┌───────────────────┐
                    │  Creata Search     │
                    │  (finds handle)    │
                    └────────┬──────────┘
                             │
                             ▼
                    ┌───────────────────┐
              ┌─────│   Sherlock         │─────┐
              │     │  (400 platforms)   │     │
              │     └────────┬──────────┘     │
              ▼              ▼                ▼
    ┌─────────────┐  ┌──────────────┐  ┌───────────┐
    │ Found other  │  │ Found        │  │ Found     │
    │ platforms    │  │ LinkedIn     │  │ GitHub    │
    └──────┬──────┘  │ / Website    │  └─────┬─────┘
           │         └──────┬───────┘        │
           ▼                ▼                 ▼
    ┌──────────┐    ┌──────────────┐   ┌────────────┐
    │ Manual   │    │  Email       │   │ Extract    │
    │ profile  │    │  Discovery   │   │ email from │
    │ review   │    │  (3 paths)   │   │ commits    │
    └──────────┘    └──────┬───────┘   └────────────┘
                           │
                     ┌─────┴──────┐
                     │            │
                     ▼            ▼
              ┌──────────┐  ┌───────────┐
              │  theHar-  │  │  Google   │
              │  vester   │  │  Dorking  │
              │  (domain  │  │  (name +  │
              │  → email) │  │  handle)  │
              └────┬─────┘  └─────┬─────┘
                   │              │
                   └──────┬──────┘
                          ▼
                   ┌──────────────┐
                   │  Regex       │
                   │  Page Scrape │
                   │  (fallback)  │
                   └──────┬───────┘
                          │
                          ▼
                   ┌──────────────┐
                   │  Holehe      │
                   │  (services   │
                   │  linked to   │
                   │  email)      │
                   └──────┬───────┘
                          │
                          ▼
                   ┌──────────────┐
                   │  Google      │
                   │  Dork        │
                   │  → phone /   │
                   │  mentions    │
                   └──────┬───────┘
                          │
                          ▼
              ┌──────────────────────────┐
              │  Final Lead Profile      │
              │  - Handle (original)     │
              │  - Cross-platform accs   │
              │  - Email(s)              │
              │  - Phone (if public)     │
              │  - Company / Domain      │
              │  - Other linked services │
              └──────────────────────────┘
```

---

## Implementation Plan

### Phase 1 — Quick Win (1-2 days)

Add an "Enrich Lead" button to the leads detail page:

1. Install Sherlock + Holehe + theHarvester + googlesearch-python
2. Create `/app/api/enrich/route.ts`
   - Receives handle + nickname
   - Calls Sherlock (subprocess or Python wrapper)
   - From Sherlock results, if domain found → run theHarvester on it
   - Also run Google dorking queries for email
   - Returns found platforms + emails as structured data
3. UI: Button on lead detail → spinner → expands accordion of found accounts
   - Each account is a clickable link
   - Found emails shown in a list if discovered
4. Cost: Zero (no API keys)

### Phase 2 — Production Pipeline (3-5 days)

```
1. Creata saves handle to `leads` table
2. Cron job runs every 15 minutes
3. Picks unmatched leads (has handle, no enrichment)
4. Runs Sherlock → saves results to `lead_aliases` table
5. If domain found → run theHarvester on domain
   Also run Google dork + GitHub search for email
   Save found emails to `lead_emails`
6. If email found → Holehe → saves to `lead_service_registrations`
7. Google dorking → saves public mentions to `lead_osint_data`
8. WHOIS lookup on found domain → saves registrant info
9. Lead detail page shows "OSINT Enrichment" section
```

### New Database Tables

```sql
-- Cross-platform accounts found via Sherlock
CREATE TABLE lead_aliases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, platform)
);

-- Emails found via theHarvester, dorking, GitHub, or regex scrape
CREATE TABLE lead_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  source TEXT DEFAULT 'google_dork',  -- theharvester / google_dork / github / regex_scrape
  confidence INTEGER DEFAULT 50,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, email)
);

-- Public mentions found via Google dorking
CREATE TABLE lead_osint_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  snippet TEXT NOT NULL,
  source_url TEXT,
  category TEXT DEFAULT 'general',  -- phone / email / address / mention
  discovered_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Cost Breakdown

| Tool/Service | Monthly Cost | Requests Included |
|-------------|-------------|-------------------|
| Sherlock | $0 | Unlimited |
| theHarvester | $0 | Unlimited |
| Holehe | $0 | Unlimited |
| Google dorking | $0 | Rate-limited |
| GitHub search | $0 | 5000/hr with free token |
| WHOIS CLI | $0 | Rate-limited |
| Regex page scrape | $0 | Unlimited |
| **Total** | **$0** | Production-grade |

**Phase 1 and Phase 2 both cost zero dollars.**

---

## Comparison Table

| Tool | Best For | Does Creata Already Have This? | Cost |
|------|----------|-------------------------------|------|
| **Sherlock** | Handle → cross-platform accounts | No | Free |
| **theHarvester** | Domain → email list | No | Free |
| **Holehe** | Email → service registrations | No | Free |
| **Google dorking** | Name → email / phone / public footprint | No | Free |
| **GitHub search** | @domain in commits → emails | No | Free |
| **WHOIS CLI** | Domain → registrant identity | No | Free |
| **Regex scrape** | Found page → email extraction | No | Free |
| **SpiderFoot** | Full OSINT automation | No | Free (HX $150/mo) |

---

## Why This Makes Creata an OSINT Marketing Weapon

Most lead gen tools stop at "here's a list of handles." This pipeline turns
Creata into a **sales intelligence engine** — with **zero monthly cost**:

- A **real estate agent** searching for "buying first home" on TikTok →
  Sherlock finds their Twitter → theHarvester on their website → email found
  → direct outreach
- A **B2B SaaS** searching for "looking for CRM" → Sherlock finds their
  LinkedIn → Google dork finds their email in public profiles
  → you have company + title + email in one click
- A **recruiter** searching for "open to work" → Sherlock finds LinkedIn +
  GitHub + portfolio → WHOIS on their domain → full candidate dossier

**Before:** One TikTok handle.
**After:** Email, phone, LinkedIn, Twitter, company, domain, and 5+ platform
profiles — ready for a sales call. **All free.**
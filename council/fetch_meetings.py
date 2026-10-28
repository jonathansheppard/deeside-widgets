#!/usr/bin/env python3
"""Fetch upcoming Flintshire County Council meetings from ModernGov and write council/meetings.json.
Same web service and parsing as the newsroom's council papers system. Standard library only."""
import json, re, urllib.request, xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

BASE = "https://committeemeetings.flintshire.gov.uk"
UA = "DeesideNewsroom-CouncilWidget/1.0 (+https://www.deeside.com)"
DAYS_AHEAD = 45
# Committees readers are unlikely to want on the Council page
SKIP = ("SACRE", "STANDING ADVISORY", "Licensing Sub-Committee")

def tag(t): return t.split("}", 1)[-1].lower()
def uk(d): return d.strftime("%d/%m/%Y")

def parse_date(s):
    s = (s or "").strip()
    for f in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%d/%m/%Y"):
        try: return datetime.strptime(s[:19] if "T" in s else s[:10], f).date().isoformat()
        except ValueError: pass
    return None

today = date.today()
url = f"{BASE}/mgWebService.asmx/GetMeetings?lCommitteeId=0&sFromDate={uk(today)}&sToDate={uk(today + timedelta(days=DAYS_AHEAD))}"
req = urllib.request.Request(url, headers={"User-Agent": UA})
root = ET.fromstring(urllib.request.urlopen(req, timeout=60).read())

meetings = []
for com in root.iter():
    if tag(com.tag) != "committee": continue
    name = next(((k.text or "").strip() for k in com if tag(k.tag) == "committeetitle"), "")
    if any(s.lower() in name.lower() for s in SKIP): continue
    for mt in com.iter():
        if tag(mt.tag) != "meeting": continue
        f = {tag(k.tag): (k.text or "").strip() for k in mt if len(k) == 0}
        mid, d = f.get("meetingid", ""), parse_date(f.get("meetingdate", ""))
        if not mid.isdigit() or not d or d < today.isoformat(): continue
        status = f.get("meetingstatus", "")
        if re.search(r"cancel", status, re.I): continue
        meetings.append({"committee": name, "date": d, "time": f.get("meetingtime", ""),
                         "webcast": f.get("iswebcast", "").lower() == "true",
                         "special": "special" in status.lower(),
                         "url": f"{BASE}/ieListDocuments.aspx?MId={mid}"})

meetings.sort(key=lambda m: (m["date"], m["time"]))
out = {"updated": datetime.now(timezone.utc).isoformat(timespec="seconds"), "meetings": meetings[:12]}
Path(__file__).with_name("meetings.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(f"{len(meetings)} meetings found, {len(out['meetings'])} written")

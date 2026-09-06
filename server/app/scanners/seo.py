import re
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from app.models.scan import Severity
from app.scanners.base import BaseScanner, FindingResult, ScanContext


def _finding(severity, title, description, evidence, remediation, confidence=0.95):
    return FindingResult(severity, title, description, evidence, remediation, confidence=confidence)


async def _get(context: ScanContext, url: str):
    return await context.http.get(url)


class SeoScanner(BaseScanner):
    name, category = "seo_scanner", "seo"

    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        response = await _get(context, target)
        html = response.text[:2_000_000]
        soup = BeautifulSoup(html, "html.parser")
        findings: list[FindingResult] = []
        parsed_target = urlparse(target)

        robots_url = urljoin(target, "/robots.txt")
        robots = await _get(context, robots_url)
        robots_text = robots.text[:200_000] if robots.status_code < 400 else ""
        if robots.status_code >= 400 or not robots_text.strip():
            findings.append(_finding(
                Severity.medium, "robots.txt is missing", "Search engine crawlers do not have a published robots policy.",
                {"url": robots_url, "status_code": robots.status_code},
                "Publish a valid robots.txt at the site root with intentional crawl rules.",
            ))
        elif not re.search(r"(?im)^\s*(user-agent|disallow|allow|sitemap)\s*:", robots_text):
            findings.append(_finding(
                Severity.low, "robots.txt appears invalid", "The robots.txt response does not contain standard crawler directives.",
                {"url": robots_url}, "Use User-agent, Allow/Disallow, and Sitemap directives according to the robots.txt standard.",
            ))
        if re.search(r"(?im)^\s*(?:user-agent\s*:\s*\*\s*\n)?\s*disallow\s*:\s*/\s*$", robots_text):
            findings.append(_finding(
                Severity.high, "robots.txt blocks crawling", "The published robots policy appears to disallow the whole site.",
                {"url": robots_url, "directive": "Disallow: /"},
                "Remove the site-wide block unless this environment is intentionally private.",
            ))
        sitemap_url = next((line.split(":", 1)[1].strip() for line in robots_text.splitlines()
                            if line.lower().startswith("sitemap:") and ":" in line), urljoin(target, "/sitemap.xml"))
        sitemap = await _get(context, sitemap_url)
        if sitemap.status_code >= 400 or not re.search(r"<\s*(urlset|sitemapindex)\b", sitemap.text[:500_000], re.I):
            findings.append(_finding(
                Severity.medium, "XML sitemap is missing or invalid", "No valid XML sitemap was found at the standard location or robots.txt location.",
                {"url": sitemap_url, "status_code": sitemap.status_code},
                "Publish a valid sitemap.xml and reference it from robots.txt.",
            ))

        titles = soup.find_all("title")
        title = titles[0].get_text(" ", strip=True) if titles else ""
        if not title:
            findings.append(_finding(Severity.high, "Title tag is missing", "Search engines and answer engines lack a primary page title.",
                                     {"url": target}, "Add one unique, descriptive title tag of roughly 50-60 characters."))
        elif len(titles) > 1 or not 30 <= len(title) <= 65:
            findings.append(_finding(
                Severity.low, "Title tag needs optimization",
                "The page title is duplicated or outside the usual search-result length range.",
                {"length": len(title), "title_count": len(titles)}, "Use one specific title of about 50-60 characters.",
            ))
        meta_description = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
        description = (meta_description.get("content") or "").strip() if meta_description else ""
        if not description:
            findings.append(_finding(Severity.medium, "Meta description is missing", "Search engines and answer engines lack a concise page summary.",
                                     {"url": target}, "Add a unique, useful meta description of roughly 120-160 characters."))
        elif not 100 <= len(description) <= 170:
            findings.append(_finding(Severity.low, "Meta description needs optimization", "The meta description is outside the usual search-result length range.",
                                     {"length": len(description)}, "Keep the description concise and useful, ideally 120-160 characters."))

        canonical = soup.find("link", rel=lambda value: value and "canonical" in value)
        canonical_url = urljoin(target, canonical.get("href", "").strip()) if canonical and canonical.get("href") else ""
        if not canonical_url:
            findings.append(_finding(Severity.medium, "Canonical URL is missing", "Duplicate or parameterized URLs have no preferred indexable URL.",
                                     {"url": target}, "Add one absolute or root-relative canonical link pointing to the preferred URL."))
        elif urlparse(canonical_url).netloc and urlparse(canonical_url).netloc != parsed_target.netloc:
            findings.append(_finding(Severity.medium, "Canonical URL points to another host", "The canonical tag selects a different hostname than the scanned page.",
                                     {"canonical": canonical_url, "host": parsed_target.netloc}, "Confirm the cross-domain canonical is intentional and correct."))

        for property_name in ("og:title", "og:description"):
            if not soup.find("meta", attrs={"property": property_name}) and not soup.find("meta", attrs={"name": property_name}):
                findings.append(_finding(Severity.low, f"Missing {property_name}", "Social previews and some answer-engine link previews may lack this field.",
                                         {"property": property_name}, f"Add a meaningful {property_name} Open Graph tag."))

        og_image_tag = soup.find("meta", attrs={"property": "og:image"}) or soup.find("meta", attrs={"name": "og:image"})
        if not og_image_tag or not (og_image_tag.get("content") or "").strip():
            findings.append(_finding(Severity.low, "Missing og:image", "Social previews and some answer-engine link previews may lack this field.",
                                     {"property": "og:image"}, "Add a meaningful og:image Open Graph tag."))
        else:
            og_img_url = urljoin(target, og_image_tag.get("content", "").strip())
            if not og_img_url.startswith(("http://", "https://")):
                findings.append(_finding(Severity.low, "Invalid og:image URL", "The og:image tag does not contain a valid absolute HTTP/HTTPS URL.",
                                         {"og:image": og_img_url}, "Ensure og:image is a fully-qualified HTTPS image URL."))
            else:
                try:
                    img_resp = await context.http.get(og_img_url)
                    if img_resp.status_code in (401, 403, 404, 500, 502, 503):
                        findings.append(_finding(
                            Severity.medium,
                            "og:image is inaccessible or blocked",
                            f"The declared og:image returned HTTP {img_resp.status_code}. Social media platforms (Twitter, LinkedIn) and crawlers cannot fetch this preview image.",
                            {"og:image": og_img_url, "status_code": img_resp.status_code},
                            "Host your OpenGraph preview image on a publicly accessible CDN without basic authentication or bot challenge blocks."
                        ))
                except Exception:
                    pass

        headings = soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
        h1s = soup.find_all("h1")
        if len(h1s) == 0:
            findings.append(_finding(Severity.medium, "H1 heading is missing", "The page has no primary heading to identify its main topic.",
                                     {"heading_count": 0}, "Add one clear H1 describing the page's primary topic."))
        elif len(h1s) > 1:
            findings.append(_finding(Severity.low, "Multiple H1 headings found", "Multiple primary headings can make the page topic ambiguous.",
                                     {"h1_count": len(h1s)}, "Use one primary H1 and use lower-level headings for sections."))
        levels = [int(tag.name[1]) for tag in headings]
        if any(current - previous > 1 for previous, current in zip(levels, levels[1:])):
            findings.append(_finding(Severity.low, "Heading hierarchy skips levels", "Heading levels jump over one or more intermediate levels.",
                                     {"levels": levels}, "Nest headings in logical order without skipping levels."))

        images = soup.find_all("img")
        missing_alt = [img.get("src", "")[:200] for img in images if img.get("alt") is None]
        if missing_alt:
            findings.append(_finding(Severity.medium, "Images are missing alt text", "Some images cannot be understood by search engines or assistive technologies.",
                                     {"images": len(images), "missing_alt": len(missing_alt), "examples": missing_alt[:5]},
                                     "Add concise alt text to informative images and an empty alt attribute to decorative images."))

        if not soup.find("meta", attrs={"name": re.compile(r"^viewport$", re.I)}):
            findings.append(_finding(Severity.medium, "Viewport meta tag is missing", "Mobile browsers lack an explicit responsive viewport policy.",
                                     {"url": target}, "Add a responsive viewport such as width=device-width, initial-scale=1."))
        return findings

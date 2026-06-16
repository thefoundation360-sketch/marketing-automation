#!/usr/bin/env python3
"""
Backcountry Brotherhood — 30-Day Facebook Content Generator
Authentic hunting and fishing content for Baby Boomer men (ages 60-75)

Usage:
    python generate_posts.py                          # All 30 posts
    python generate_posts.py --type nostalgia         # Filter by type
    python generate_posts.py --output my_posts.csv    # Custom filename

Content types: nostalgia, gear_review, question_poll,
               scenic_caption, affiliate_roundup, video_script
"""

import csv
import sys
import argparse

VALID_TYPES = [
    "nostalgia",
    "gear_review",
    "question_poll",
    "scenic_caption",
    "affiliate_roundup",
    "video_script",
]

# Affiliate slot appears on these calendar days regardless of content type
AFFILIATE_DAYS = {1, 5, 8, 12, 15, 19, 22, 26, 29}

# 30 days of content — one entry per day, in order
# Each entry: post_type, hook, body, cta, hashtags
CONTENT = [
    # ── DAY 1 ── Nostalgia | Affiliate: Yes
    {
        "post_type": "nostalgia",
        "hook": "There's something about the smell of gun oil and fresh coffee at 4am that can't be explained to someone who's never felt it.",
        "body": (
            "My dad would have the truck running and the thermos full before I even had my boots tied. "
            "We didn't talk much on those drives out, but I understood everything. "
            "That silence meant we were doing something that mattered. "
            "Those mornings made me the man I am — and I think about them more now that he's gone."
        ),
        "cta": "If your old man took you out before sunrise, tag him or drop his name below. Let's honor them today.",
        "hashtags": "#BackcountryBrotherhood #HuntingDad #OpeningDayMemories #OutdoorLegacy #WhitetailHunting",
    },
    # ── DAY 2 ── Gear Review
    {
        "post_type": "gear_review",
        "hook": "I've worn a lot of hunting boots over 40 years. These are the ones I'd buy again without thinking twice.",
        "body": (
            "Waterproofing that actually works past the first season. "
            "A sole with enough grip to handle steep shale without turning your ankle. "
            "And insulation that keeps your feet warm without making them sweat through by 9am — "
            "that combination is rarer than people think. "
            "I wore these through a late November elk season in Colorado and never once thought about my feet."
        ),
        "cta": "Link in comments. What boots have you trusted long enough to buy a second pair?",
        "hashtags": "#HuntingBoots #ElkHunting #BackcountryBrotherhood #HuntingGear #OutdoorGear",
    },
    # ── DAY 3 ── Question/Poll
    {
        "post_type": "question_poll",
        "hook": "Here's a question that'll sort out a room of hunters fast: rifle, bow, or muzzleloader?",
        "body": (
            "I've hunted with all three and each one demands something different from you. "
            "The rifle rewards precision and patience. "
            "The bow rewards discipline and dedication that most men won't put in. "
            "The muzzleloader gives you one shot and a lungful of smoke — and that's it. "
            "Every man has a strong opinion about which one builds the better hunter."
        ),
        "cta": "Drop your weapon of choice in the comments. Defend your answer.",
        "hashtags": "#HuntingPoll #BowhuntingVsRifle #MuzzleloaderHunting #BackcountryBrotherhood #WhitetailHunting",
    },
    # ── DAY 4 ── Scenic Caption
    {
        "post_type": "scenic_caption",
        "hook": "Sunrise over still water. There's no better alarm clock in the world.",
        "body": (
            "You earn this view by getting up before you want to and going somewhere most people won't bother. "
            "The coffee's still hot, the fog is just starting to lift off the water, "
            "and for a few minutes before the world wakes up it feels like the whole place belongs to you. "
            "This is why we do it — not just for the fish or the deer, but for this."
        ),
        "cta": "Share this with someone who needs to be reminded what they're missing.",
        "hashtags": "#SunriseHunting #MorningOnTheWater #BackcountryBrotherhood #OutdoorLife #NaturePhotography",
    },
    # ── DAY 5 ── Affiliate Roundup | Affiliate: Yes
    {
        "post_type": "affiliate_roundup",
        "hook": "Three pieces of gear that paid for themselves in the first season. Straight talk, no fluff.",
        "body": (
            "A headlamp you can actually use with gloves on. "
            "Hand warmers that last longer than the cheap ones you've been grabbing at the gas station. "
            "And a quality merino wool base layer that handles both sweating on the way in "
            "and sitting cold for three hours on the way out. "
            "These aren't glamour items — they're the gear that separates a good morning from a miserable one."
        ),
        "cta": "Links in comments. What's the one piece of gear you'd never leave home without?",
        "hashtags": "#HuntingGear #BackcountryBrotherhood #GearReview #OutdoorGear #WhitetailHunting",
    },
    # ── DAY 6 ── Video Script
    {
        "post_type": "video_script",
        "hook": "This is what it sounds like at 5am in elk country. Just listen.",
        "body": (
            "No narration for the first 30 seconds — just the timber before first light. "
            "Then a bugle in the distance. Then another one, closer. "
            "Then you put the camera down and start moving. "
            "That's the moment every mile of scouting, every early morning, every off-season leads to — "
            "and you don't forget what it sounds like."
        ),
        "cta": "Full video in comments. Tell us where you've heard a bull bugle and how close he got.",
        "hashtags": "#ElkHunting #BullElk #BackcountryBrotherhood #ElkBugle #HuntingVideos",
    },
    # ── DAY 7 ── Nostalgia
    {
        "post_type": "nostalgia",
        "hook": "My first deer rifle was a hand-me-down with a scratched stock and a loose sling. I wouldn't trade it for anything in a glass case.",
        "body": (
            "Dad bought it used from a guy at the gas station for forty bucks and said it would do the job if I did mine. "
            "He was right. "
            "I killed my first buck with that gun at 14 years old and I still remember every detail of that morning — "
            "the cold, the way he dropped, the handshake. "
            "Some things just stay with you."
        ),
        "cta": "What was your first deer rifle? Drop the make and model in the comments.",
        "hashtags": "#FirstDeer #HuntingLegacy #OldRifles #BackcountryBrotherhood #WhitetailHunting",
    },
    # ── DAY 8 ── Gear Review | Affiliate: Yes
    {
        "post_type": "gear_review",
        "hook": "This scope changed everything about my long-range shots. I'll tell you exactly why.",
        "body": (
            "I ran budget glass for years because that's what the budget allowed. "
            "But after a buddy let me look through a quality riflescope last fall, I understood what I'd been missing — "
            "especially at dusk when you're trying to pick out a deer in the tree line. "
            "The clarity at the end of legal light isn't a luxury when the shot matters. "
            "It's part of the equipment doing its job."
        ),
        "cta": "Link in comments. What scope are you running right now?",
        "hashtags": "#RifleScope #LongRangeShooting #BackcountryBrotherhood #HuntingGear #WhitetailHunting",
    },
    # ── DAY 9 ── Question/Poll
    {
        "post_type": "question_poll",
        "hook": "Public land or private land — where do you do most of your hunting?",
        "body": (
            "Public land hunting is hard. "
            "You're competing with every other hunter in the county for deer that have been educated by pressure. "
            "But there's a real pride in killing a good buck off public ground that's hard to match. "
            "Private land has its advantages, no question — "
            "but some would say it makes for a different kind of hunter."
        ),
        "cta": "Tell us where you hunt and why in the comments. We want to hear it.",
        "hashtags": "#PublicLandHunting #PrivateLand #BackcountryBrotherhood #WhitetailHunting #HunterLife",
    },
    # ── DAY 10 ── Scenic Caption
    {
        "post_type": "scenic_caption",
        "hook": "First frost of the season. The woods change overnight when this happens.",
        "body": (
            "Every track reads clear, every sound carries further, and the deer start moving differently. "
            "There's a chill in your lungs that reminds you you're alive. "
            "The woods in October carry something old and serious in them — "
            "impossible to explain to someone who hasn't been out there when it settles in."
        ),
        "cta": "Tag someone who knows exactly what this morning feels like.",
        "hashtags": "#FirstFrost #OctoberHunting #BackcountryBrotherhood #WhitetailDeer #HuntingLife",
    },
    # ── DAY 11 ── Affiliate Roundup
    {
        "post_type": "affiliate_roundup",
        "hook": "Fishing gear worth spending real money on — and what you can buy cheap without losing sleep.",
        "body": (
            "Spend money on your reel and never cut corners on your line. "
            "But hooks? Brand doesn't matter much on most species. "
            "A quality tackle box that actually closes and keeps moisture out will serve you 20 years. "
            "And a net with a rubber bag lets you put fish back without tearing them up. "
            "The basics done right will beat the gadgets every single time."
        ),
        "cta": "Links in comments. What's the best fishing purchase you've made in the last couple of years?",
        "hashtags": "#FishingGear #TackleBox #BackcountryBrotherhood #FishingTips #OutdoorGear",
    },
    # ── DAY 12 ── Video Script | Affiliate: Yes
    {
        "post_type": "video_script",
        "hook": "I filmed every step of quartering my bull elk at 9,200 feet. Here's how it's actually done.",
        "body": (
            "This isn't glamorous work — it's heavy, cold, and takes twice as long as you expect the first time. "
            "But doing it right means the meat is clean and the animal is respected. "
            "We walk through field dressing, skinning, quartering, and cooling — "
            "the way it actually works in the backcountry where you can't cut corners."
        ),
        "cta": "Full video in comments. If you picked up something useful, pass it along to your hunting crew.",
        "hashtags": "#ElkHunting #FieldDressing #BackcountryBrotherhood #EatWhatYouKill #HuntingVideos",
    },
    # ── DAY 13 ── Nostalgia
    {
        "post_type": "nostalgia",
        "hook": "We didn't have trail cameras. We had boot leather and patience.",
        "body": (
            "You learned the land by walking it, season after season, until you knew where the deer were going to be before they knew it themselves. "
            "There was something deeply satisfying about earning that knowledge the hard way. "
            "A lot of guys today spend more time hunting their phone screen than hunting the woods — "
            "and the deer know the difference."
        ),
        "cta": "Old school or new school — what do you think matters more, woodsmanship or technology?",
        "hashtags": "#TrailCameras #WhitetailHunting #BackcountryBrotherhood #HunterLife #OutdoorTradition",
    },
    # ── DAY 14 ── Question/Poll
    {
        "post_type": "question_poll",
        "hook": "What time of year do you love most in the outdoors? We've got a feeling the comments will be all over the map.",
        "body": (
            "Some men come alive in the rut when the big bucks are moving and daylight is cold. "
            "Others live for the first day the bass are feeding shallow in spring. "
            "A few of you are salmon men or elk men — October in the mountains is your whole year. "
            "The outdoors gives you something every month if you know where to look."
        ),
        "cta": "Drop your favorite month in the comments and tell us why it's yours.",
        "hashtags": "#HuntingSeasons #FishingSeasons #BackcountryBrotherhood #OutdoorLife #WhitetailHunting",
    },
    # ── DAY 15 ── Gear Review | Affiliate: Yes
    {
        "post_type": "gear_review",
        "hook": "A quality hunting knife is the one piece of gear most hunters underestimate until the moment they need it.",
        "body": (
            "I've cleaned deer with $8 blades and with a fixed-blade that cost real money. "
            "The difference shows in the details — how long the edge holds, "
            "how the handle feels when your hands are cold and wet, "
            "whether you trust it when you have to put real pressure on it. "
            "A good hunting knife isn't an expense. It's a 20-year investment."
        ),
        "cta": "Link in comments. What knife is in your pack right now?",
        "hashtags": "#HuntingKnife #FixedBlade #BackcountryBrotherhood #HuntingGear #WhitetailHunting",
    },
    # ── DAY 16 ── Scenic Caption
    {
        "post_type": "scenic_caption",
        "hook": "There's a reason we keep going back to the same river.",
        "body": (
            "It isn't always about the fish. "
            "Sometimes it's the sound water makes moving over rocks, "
            "or the way light comes through the cottonwoods in late afternoon. "
            "Out here nothing can reach you — you can leave whatever's weighing on you at the truck. "
            "The river doesn't care what you brought with you."
        ),
        "cta": "Where's your river? Drop the name or describe it in the comments.",
        "hashtags": "#RiverFishing #FlyFishing #BackcountryBrotherhood #NatureHeals #OutdoorLife",
    },
    # ── DAY 17 ── Nostalgia
    {
        "post_type": "nostalgia",
        "hook": "Nobody said a word when we drove home without filling tags. Some trips were just about being out there.",
        "body": (
            "My grandfather taught me that a day in the woods was never wasted, even empty-handed. "
            "The woods fed something in you that the rest of life couldn't touch. "
            "You left something heavy behind every time you went in. "
            "I've passed that on to my kids the best I could — hope it stuck."
        ),
        "cta": "What's a hunting memory you have that had nothing to do with the kill? Tell us.",
        "hashtags": "#HuntingMemories #BackcountryBrotherhood #OutdoorLife #WhitetailDeer #HunterMindset",
    },
    # ── DAY 18 ── Affiliate Roundup
    {
        "post_type": "affiliate_roundup",
        "hook": "Five things every hunting camp needs that most guys forget until they're 60 miles in.",
        "body": (
            "A real first aid kit — not the gas station version. "
            "Extra batteries for everything that matters. "
            "Moleskin for your feet before the blisters start, not after. "
            "A backup firestarter that works when it's wet. "
            "And duct tape — I've fixed boot soles, pack straps, and tarp seams with it in the backcountry, "
            "and the difference between a bad day and a good story is almost always preparation."
        ),
        "cta": "Links in comments. What's your non-negotiable camp item that other guys always forget?",
        "hashtags": "#HuntingCamp #BackcountryHunting #BackcountryBrotherhood #CampGear #ElkHunting",
    },
    # ── DAY 19 ── Video Script | Affiliate: Yes
    {
        "post_type": "video_script",
        "hook": "Watch this whitetail walk in from 400 yards and work the scrape exactly the way the books say. Textbook rut behavior.",
        "body": (
            "You can study deer behavior for years and still get surprised when you see it right in front of you. "
            "This buck checked the scrape, hit the licking branch, circled downwind, then walked straight in — no hesitation. "
            "The rut makes whitetails do things they'd never do any other month of the year. "
            "This is why November matters."
        ),
        "cta": "Full video in comments. Drop your best rut encounter story below.",
        "hashtags": "#RutHunting #WhitetailDeer #BackcountryBrotherhood #ScrapeHunting #HuntingVideos",
    },
    # ── DAY 20 ── Question/Poll
    {
        "post_type": "question_poll",
        "hook": "Solo hunt or bring a buddy? There's no wrong answer here — but every man has a strong preference.",
        "body": (
            "There's something about going in alone. "
            "Nobody to make noise, nobody to disagree about where to sit — just you and the woods making a deal. "
            "But hunting with a good friend or your son is something else entirely: "
            "the camp at night, the jokes, the shared memory of a hunt that went exactly right. "
            "Both are worth doing."
        ),
        "cta": "Solo or with a partner? Tell us your preference and why.",
        "hashtags": "#SoloHunting #HuntingBuddy #BackcountryBrotherhood #WhitetailHunting #HunterLife",
    },
    # ── DAY 21 ── Scenic Caption
    {
        "post_type": "scenic_caption",
        "hook": "No cell service. No news. No problem.",
        "body": (
            "Three days in elk camp without a single notification. "
            "Just the smell of pines, the sound of wind through the timber, "
            "and real decisions to make every morning — where to go, how to get there, whether the wind is right. "
            "This is the kind of quiet that resets a man. Hard to find it anywhere else."
        ),
        "cta": "When's the last time you truly unplugged? Tell us where you went.",
        "hashtags": "#ElkCamp #BackcountryHunting #BackcountryBrotherhood #OffGrid #OutdoorLife",
    },
    # ── DAY 22 ── Nostalgia | Affiliate: Yes
    {
        "post_type": "nostalgia",
        "hook": "If your dad taught you to hunt, you got something money can't buy.",
        "body": (
            "Not everyone had that. "
            "Some of us figured it out alone, or had a neighbor or a coach who took us out the first time. "
            "Either way, somebody showed us the way in — and that matters more than they probably knew. "
            "The tradition only keeps going if somebody carries it forward. Don't let it end with you."
        ),
        "cta": "Tag someone who taught you something in the field. Let 'em know you haven't forgotten.",
        "hashtags": "#HuntingDad #OutdoorLegacy #BackcountryBrotherhood #PassItOn #HunterLife",
    },
    # ── DAY 23 ── Gear Review
    {
        "post_type": "gear_review",
        "hook": "I tested this rangefinder in the Rockies last September. Here's the honest report.",
        "body": (
            "Accurate out to 1,000 yards on reflective targets, reliable on deer-sized animals past 600. "
            "Angle compensation built in — which matters when you're shooting steeply downhill from a ridge. "
            "It's not the cheapest unit on the shelf, but it isn't pretending to be. "
            "For elk or mule deer at real distance, guessing costs tags."
        ),
        "cta": "Link in comments. Are you running a rangefinder in the field, or trusting your eye?",
        "hashtags": "#Rangefinder #ElkHunting #BackcountryBrotherhood #HuntingGear #LongRangeShooting",
    },
    # ── DAY 24 ── Video Script
    {
        "post_type": "video_script",
        "hook": "Fly fishing a high-altitude lake most guys never find because they stop at the trailhead.",
        "body": (
            "Three miles in, 8,400 feet, and the cutthroat trout have never seen a hook. "
            "They hit dry flies like they're starving because out here nobody has educated them. "
            "The water is the color of green glass and cold enough to take your breath away. "
            "You just have to earn it."
        ),
        "cta": "Full video in comments. Have you ever hiked into water that far off the road? Tell us about it.",
        "hashtags": "#FlyFishing #CutthroatTrout #BackcountryFishing #BackcountryBrotherhood #HighAltitudeFishing",
    },
    # ── DAY 25 ── Question/Poll
    {
        "post_type": "question_poll",
        "hook": "Lake fishing or river fishing — where do you feel most at home?",
        "body": (
            "A still lake in the morning has its own kind of peace. "
            "You can see for miles and the fish come up slow and deliberate. "
            "But a river moves and breathes like a living thing — "
            "reading the current, finding the seams, matching the hatch on a trout stream "
            "is a puzzle worth solving season after season."
        ),
        "cta": "Lake or river? Drop your answer below and tell us where.",
        "hashtags": "#LakeFishing #RiverFishing #TroutFishing #BackcountryBrotherhood #FishingLife",
    },
    # ── DAY 26 ── Scenic Caption | Affiliate: Yes
    {
        "post_type": "scenic_caption",
        "hook": "The mountains don't care how old you are. They just ask if you'll show up.",
        "body": (
            "The trail is the same as it was 20 years ago. You're not. "
            "But the view at the top doesn't change — and neither does the feeling when you get there. "
            "Some men stop going into the backcountry when the years start adding up. "
            "The ones who keep going seem to age differently."
        ),
        "cta": "Share this with the man in your life who needs to hear it today.",
        "hashtags": "#BackcountryHunting #MountainHunting #BackcountryBrotherhood #KeepGoing #OutdoorLife",
    },
    # ── DAY 27 ── Nostalgia
    {
        "post_type": "nostalgia",
        "hook": "My first trout came out of a creek you could jump across. Best fish I ever caught.",
        "body": (
            "We used a cane pole and nightcrawlers dug from the garden, "
            "and I thought we were the two smartest fishermen alive. "
            "My uncle could read water like some men read books — he knew where they'd be holding "
            "before we even got a line wet. "
            "I still fish that same stretch when I go back home. The creek's smaller than I remember."
        ),
        "cta": "What's the most memorable fish you ever caught — and how old were you? Tell us the whole story.",
        "hashtags": "#TroutFishing #FishingMemories #BackcountryBrotherhood #OutdoorLife #FirstFish",
    },
    # ── DAY 28 ── Affiliate Roundup
    {
        "post_type": "affiliate_roundup",
        "hook": "The best hunting apps for men who don't want to spend all day staring at a screen.",
        "body": (
            "One for maps and land ownership — knowing who owns what matters more than it used to. "
            "One for weather that gives you wind at elevation, not just at your zip code. "
            "And one for moon phases, which after 40 years I've started to actually believe in. "
            "None of these replace knowing the land. But they've saved me a few wrong turns."
        ),
        "cta": "Links in comments. Are you using apps in the field or going old school with a paper topo?",
        "hashtags": "#HuntingApps #BackcountryHunting #BackcountryBrotherhood #HuntingGear #WhitetailHunting",
    },
    # ── DAY 29 ── Gear Review | Affiliate: Yes
    {
        "post_type": "gear_review",
        "hook": "This rod handled a 28-inch walleye without a complaint. It's earned a permanent spot in my truck.",
        "body": (
            "Light enough to fish all day without wearing your wrist out. "
            "Sensitive enough to feel a light bite in 20 feet of water. "
            "Stiff enough in the backbone when you set the hook hard on something that doesn't want to come in. "
            "I've broken budget rods doing exactly this. This one didn't move."
        ),
        "cta": "Link in comments. What rod and reel combo are you fishing right now?",
        "hashtags": "#FishingRod #WalleyeFishing #BackcountryBrotherhood #FishingGear #OutdoorGear",
    },
    # ── DAY 30 ── Video Script
    {
        "post_type": "video_script",
        "hook": "I sat in this treestand for 11 hours waiting on one specific buck. Here's how that day went.",
        "body": (
            "Most hunting is waiting — real waiting, the kind where you don't move for hours "
            "and your back starts making arguments with you. "
            "I'd been watching this deer for two seasons and knew his pattern better than my own schedule. "
            "Day 11 of the sit, he showed up at last light. "
            "Some things take as long as they take."
        ),
        "cta": "Full story in comments. What's the longest you've ever waited on one specific buck?",
        "hashtags": "#TreestandHunting #BigBuck #BackcountryBrotherhood #WhitetailDeer #HuntingPatience",
    },
]


def build_rows(filter_type: str | None) -> list[dict]:
    rows = []
    for day_index, post in enumerate(CONTENT, start=1):
        if filter_type and post["post_type"] != filter_type:
            continue
        rows.append(
            {
                "Day": day_index,
                "Post Type": post["post_type"],
                "Hook": post["hook"],
                "Body": post["body"],
                "CTA": post["cta"],
                "Hashtags": post["hashtags"],
                "Affiliate Slot": "Yes" if day_index in AFFILIATE_DAYS else "No",
            }
        )
    return rows


def write_csv(rows: list[dict], output_path: str) -> None:
    fieldnames = ["Day", "Post Type", "Hook", "Body", "CTA", "Hashtags", "Affiliate Slot"]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def print_summary(rows: list[dict], filter_type: str | None, output_path: str) -> None:
    type_counts: dict[str, int] = {}
    affiliate_count = 0
    for row in rows:
        t = row["Post Type"]
        type_counts[t] = type_counts.get(t, 0) + 1
        if row["Affiliate Slot"] == "Yes":
            affiliate_count += 1

    scope = f"({filter_type} only)" if filter_type else "(all types)"
    print(f"\nBackcountry Brotherhood — Content Generated {scope}")
    print(f"{'─' * 50}")
    print(f"  Total posts : {len(rows)}")
    print(f"  Affiliate   : {affiliate_count} posts")
    print(f"  Output file : {output_path}")
    print(f"\n  Posts by type:")
    for post_type in VALID_TYPES:
        count = type_counts.get(post_type, 0)
        if count:
            affiliate_days = [
                r["Day"] for r in rows
                if r["Post Type"] == post_type and r["Affiliate Slot"] == "Yes"
            ]
            tag = f"  ← affiliate on day(s) {affiliate_days}" if affiliate_days else ""
            print(f"    {post_type:<20} {count} post(s){tag}")
    print()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate 30 days of Facebook content for Backcountry Brotherhood",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="\n".join(
            [
                "Examples:",
                "  python generate_posts.py",
                "  python generate_posts.py --type nostalgia",
                "  python generate_posts.py --type gear_review --output gear_only.csv",
            ]
        ),
    )
    parser.add_argument(
        "--type",
        choices=VALID_TYPES,
        metavar="TYPE",
        help=(
            "Filter output to a single content type. "
            f"Choices: {', '.join(VALID_TYPES)}"
        ),
    )
    parser.add_argument(
        "--output",
        default="backcountry_brotherhood_30_days.csv",
        help="Output CSV filename (default: backcountry_brotherhood_30_days.csv)",
    )
    args = parser.parse_args()

    rows = build_rows(filter_type=args.type)

    if not rows:
        print(f"No posts found for type: {args.type}", file=sys.stderr)
        sys.exit(1)

    write_csv(rows, args.output)
    print_summary(rows, args.type, args.output)


if __name__ == "__main__":
    main()

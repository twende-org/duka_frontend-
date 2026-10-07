import PolicyPage, { type PolicyContent } from "@/components/common/PolicyPage";

const en: PolicyContent = {
  pageTitle: "Privacy Policy",
  updated: "Last updated: 7 October 2026",
  intro:
    'Twende Duka is a shop management and marketplace platform operated by TwendeDigital (Dar es Salaam, Tanzania). This Privacy Policy explains what information we collect when you use https://duka.twendedigital.tech (the "Service"), how we use it, and the choices you have.',
  sections: [
    {
      title: "Information We Collect",
      paragraphs: ["We collect the following information when you use the Service:"],
      bullets: [
        "Account information — your name, email address and profile details, including information provided when you sign in with Google.",
        "Business data — shop details, products, inventory, sales, expenses, orders and customer records that you enter into the Service.",
        "Photos and AI-derived text — product photos you upload and the text our AI extracts from them for smart catalogue filling.",
        "Social integration data — when you connect a Facebook Page or TikTok account, we store the access tokens and basic profile details (such as account name and ID) needed to publish content on your behalf.",
        "Technical data — basic device and usage information (such as browser type and pages visited) needed to keep the Service secure and working.",
      ],
    },
    {
      title: "How We Use Your Information",
      paragraphs: ["We use your information to:"],
      bullets: [
        "Provide, operate and maintain the Service, including your shop, marketplace and social publishing features.",
        "Publish content to your connected Facebook Page or TikTok account, only when you explicitly request it.",
        "Improve the Service through aggregated, non-identifying usage statistics and service updates.",
      ],
    },
    {
      title: "Facebook and TikTok Integrations",
      paragraphs: [
        "When you connect a Facebook Page, we request permission to manage and publish posts on that Page. When you connect TikTok, we request the user.info.basic, video.upload and video.publish permissions so you can upload and post videos to your TikTok account from Twende Duka.",
        "Access tokens are stored securely on our servers, are never visible to other users, and are only used to perform actions you initiate. You can disconnect a platform at any time from within the app, which removes the stored token. Your use of Facebook and TikTok is also governed by the terms and privacy policies of Meta Platforms, Inc. and TikTok.",
      ],
    },
    {
      title: "Data Storage, Retention and Deletion",
      paragraphs: [
        "Your data is retained while your account is active. You can request a copy of your data, ask us to correct it, or ask us to delete it by contacting us at info@twendedigital.tech.",
        "If you delete your account, we remove your personal data within 30 days, except where we must keep certain records to comply with legal or accounting obligations.",
      ],
    },
    {
      title: "Security",
      paragraphs: [
        "We protect your information with HTTPS encryption in transit, JWT-based authentication, role-based access control within shops, and server-side storage for all integration tokens. No method of transmission or storage is completely secure, but we work to protect your data using industry-standard measures.",
      ],
    },
    {
      title: "Your Rights",
      paragraphs: [
        "You have the right to access, correct, export and delete your personal data. To exercise any of these rights, contact us at info@twendedigital.tech. We respond to all requests within a reasonable time.",
      ],
    },
    {
      title: "Children's Privacy",
      paragraphs: [
        "Twende Duka is a business tool intended for adults. The Service is not directed to children under 18, and we do not knowingly collect information from them.",
      ],
    },
    {
      title: "Changes to This Policy",
      paragraphs: [
        "We may update this Privacy Policy from time to time. When we make significant changes, we will announce them in the app or by email. The date at the top of this page shows when the policy was last updated.",
      ],
    },
    {
      title: "Contact Us",
      paragraphs: [
        "If you have questions about this Privacy Policy or your data, contact us: TwendeDigital, Dar es Salaam, Tanzania — info@twendedigital.tech.",
      ],
    },
  ],
  footer: "TwendeDigital · Dar es Salaam, Tanzania · info@twendedigital.tech",
};

const sw: PolicyContent = {
  pageTitle: "Sera ya Faragha",
  updated: "Ilisasishwa mara ya mwisho: 7 Oktoba 2026",
  intro:
    'Twende Duka ni jukwaa la usimamizi wa maduka na soko linaloendeshwa na TwendeDigital (Dar es Salaam, Tanzania). Sera hii ya Faragha inaeleza taarifa tunazokusanya unapotumia https://duka.twendedigital.tech ("Huduma"), jinsi tunazitumia, na chaguo ulizo nazo.',
  sections: [
    {
      title: "Taarifa Tunazokusanya",
      paragraphs: ["Tunakusanya taarifa zifuatazo unapotumia Huduma:"],
      bullets: [
        "Taarifa za akaunti — jina lako, barua pepe na maelezo ya wasifu, ikiwemo taarifa unazotoa unapoingia kwa kutumia Google.",
        "Data ya biashara — taarifa za duka, bidhaa, stoo, mauzo, matumizi, oda na kumbukumbu za wateja unazoingiza kwenye Huduma.",
        "Picha na maandishi yanayotokana na AI — picha za bidhaa unazopakia na maandishi ambayo AI yetu inachambua kwa ajili ya kujaza katalogi kwa haraka.",
        "Data ya mitandao ya kijamii — unapounganisha Ukurasa wa Facebook au akaunti ya TikTok, tunahifadhi token za ufikiaji na maelezo ya msingi ya wasifu (kama jina na kitambulisho cha akaunti) yanayohitajika kuchapisha maudhui kwa niaba yako.",
        "Data ya kiufundi — taarifa za msingi za kifaa na matumizi (kama aina ya kivinjari na kurasa zilizotembelewa) zinazohitajika kuweka Huduma salama na inayofanya kazi.",
      ],
    },
    {
      title: "Jinsi Tunavyotumia Taarifa Zako",
      paragraphs: ["Tunatumia taarifa zako ili:"],
      bullets: [
        "Kutoa, kuendesha na kudumisha Huduma, ikiwemo duka lako, soko na vipengele vya kuchapisha mitandaoni.",
        "Kuchapisha maudhui kwenye Ukurasa wako wa Facebook au akaunti yako ya TikTok, lakini tu unapoomba hivyo waziwazi.",
        "Kuboresha Huduma kwa takwimu muhtasari zisizokutambulisha na taarifa za masasisho ya huduma.",
      ],
    },
    {
      title: "Muunganisho wa Facebook na TikTok",
      paragraphs: [
        "Unapounganisha Ukurasa wa Facebook, tunaomba ruhusa ya kusimamia na kuchapisha machapisho kwenye Ukurasa huo. Unapounganisha TikTok, tunaomba ruhusa za user.info.basic, video.upload na video.publish ili uweze kupakia na kuchapisha video kwenye akaunti yako ya TikTok kutoka Twende Duka.",
        "Token za ufikiaji huhifadhiwa kwa usalama kwenye seva zetu, hazionekani kwa watumiaji wengine, na hutumika tu kufanya vitendo unavyoanzisha wewe. Unaweza kukatisha muunganisho wa jukwaa lolote wakati wowote ndani ya programu, na hii huondoa token iliyohifadhiwa. Matumizi yako ya Facebook na TikTok pia yanatawaliwa na masharti na sera za faragha za Meta Platforms, Inc. na TikTok.",
      ],
    },
    {
      title: "Uhifadhi, Muda wa Kutunza na Ufutaji wa Data",
      paragraphs: [
        "Data yako huhifadhiwa wakati akaunti yako ipo hai. Unaweza kuomba nakala ya data yako, kutuomba kuirekebisha, au kutuomba kuifuta kwa kuwasiliana nasi kwa info@twendedigital.tech.",
        "Ukifuta akaunti yako, tunaondoa data yako ya kibinafsi ndani ya siku 30, isipokuwa pale tunapaswa kutunza kumbukumbu fulani ili kutimiza wajibu wa kisheria au wa uhasibu.",
      ],
    },
    {
      title: "Usalama",
      paragraphs: [
        "Tunalinda taarifa zako kwa usimbaji wa HTTPS wakati wa kusafirisha, uthibitishaji wa JWT, udhibiti wa ufikiaji kwa majukumu ndani ya maduka, na uhifadhi wa token zote za muunganisho kwenye seva. Hakuna njia ya usafirishaji au uhifadhi iliyo salama kabisa, lakini tunajitahidi kulinda data yako kwa viwango vinavyokubalika kitaalamu.",
      ],
    },
    {
      title: "Haki Zako",
      paragraphs: [
        "Una haki ya kufikia, kurekebisha, kutoa nakala na kufuta data yako ya kibinafsi. Kutumia haki yoyote kati ya hizi, wasiliana nasi kwa info@twendedigital.tech. Tunajibu maombi yote ndani ya muda unaofaa.",
      ],
    },
    {
      title: "Faragha ya Watoto",
      paragraphs: [
        "Twende Duka ni zana ya biashara inayolengwa kwa watu wazima. Huduma haijaelekezwa kwa watoto chini ya miaka 18, na hatukusanyi taarifa zao kwa kujua.",
      ],
    },
    {
      title: "Mabadiliko ya Sera Hii",
      paragraphs: [
        "Tunaweza kusasisha Sera hii ya Faragha mara kwa mara. Tunapofanya mabadiliko makubwa, tutayatangaza ndani ya programu au kwa barua pepe. Tarehe iliyo juu ya ukurasa huu inaonyesha lini sera ilisasishwa mara ya mwisho.",
      ],
    },
    {
      title: "Wasiliana Nasi",
      paragraphs: [
        "Kama una maswali kuhusu Sera hii ya Faragha au data yako, wasiliana nasi: TwendeDigital, Dar es Salaam, Tanzania — info@twendedigital.tech.",
      ],
    },
  ],
  footer: "TwendeDigital · Dar es Salaam, Tanzania · info@twendedigital.tech",
};

export default function Privacy() {
  return (
    <PolicyPage
      copy={{ en, sw }}
      canonical="/privacy"
      metaTitle="Privacy Policy"
      metaDescription="How Twende Duka collects, uses and protects your data, including Facebook and TikTok integrations. Last updated October 2026."
    />
  );
}

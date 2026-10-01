export interface StepMeta {
  id: number;
  title: { en: string; sw: string };
  question: { en: string; sw: string };
  helper: { en: string; sw: string };
  tip: { en: string; sw: string };
}

export const STEP_META: StepMeta[] = [
  {
    id: 1,
    title: { en: "Shop Identity", sw: "Utambulisho wa Duka" },
    question: { en: "What should customers call your shop?", sw: "Wateja wataliita vipi duka lako?" },
    helper: { en: "Basic information about your shop.", sw: "Taarifa za msingi kuhusu duka lako." },
    tip: {
      en: "Shops with a clear name and phone number get up to 3x more customer calls from the public directory.",
      sw: "Maduka yenye jina bayana na namba ya simu hupokea simu mara 3 zaidi kutoka kwenye orodha ya umma.",
    },
  },
  {
    id: 2,
    title: { en: "Shop Type & Category", sw: "Aina ya Duka & Bidhaa" },
    question: { en: "How does your shop operate and what do you sell?", sw: "Duka lako linafanyaje kazi na unauza nini?" },
    helper: { en: "Pick every option that applies to your business.", sw: "Chagua kila chaguo linalolingana na biashara yako." },
    tip: {
      en: "Your categories decide where buyers find you on the marketplace, so select all that apply.",
      sw: "Makundi unayochagua ndiyo yanayoamua wanunuzi watakupata wapi sokoni, chagua yote yanayohusika.",
    },
  },
  {
    id: 3,
    title: { en: "Product Model", sw: "Mfumo wa Bidhaa" },
    question: { en: "How are your products sold?", sw: "Bidhaa zako zinauzwaje?" },
    helper: { en: "By quantity, weight, length, volume, sets or variations.", sw: "Kwa idadi, uzito, urefu, ujazo, seti au aina tofauti." },
    tip: {
      en: "Choosing the right selling units now means your POS calculates prices correctly from day one.",
      sw: "Kuchagua vipimo sahihi sasa kunafanya POS ihesabu bei kwa usahihi tangu siku ya kwanza.",
    },
  },
  {
    id: 4,
    title: { en: "Selling Model", sw: "Mfumo wa Mauzo" },
    question: { en: "Who do you sell to, and through which channels?", sw: "Unauza kwa nani na kupitia njia gani?" },
    helper: { en: "Customer types, sales channels and pricing.", sw: "Aina za wateja, njia za mauzo na bei." },
    tip: {
      en: "Selecting B2B unlocks wholesale pricing, credit limits and purchase orders in your dashboard.",
      sw: "Ukichagua B2B utafungua bei za jumla, mikopo na oda za manunuzi kwenye dashibodi yako.",
    },
  },
  {
    id: 5,
    title: { en: "Shop Operations", sw: "Uendeshaji wa Duka" },
    question: { en: "How do you handle inventory and delivery?", sw: "Unasimamiaje mzigo na ufikishaji?" },
    helper: { en: "Stock model, storage locations and fulfillment.", sw: "Mfumo wa stoo, maeneo ya kuhifadhi na ufikishaji." },
    tip: {
      en: "Stock-based shops get automatic low-stock alerts on WhatsApp before items run out.",
      sw: "Maduka yanayoweka stoo hupata taarifa za mzigo kuisha kwa WhatsApp kabla bidhaa hazijaisha.",
    },
  },
  {
    id: 6,
    title: { en: "Location & Settings", sw: "Mahali & Mipangilio" },
    question: { en: "Where is your shop located?", sw: "Duka lako lipo wapi?" },
    helper: { en: "Pin your shop so nearby buyers can find you.", sw: "Weka alama ili wanunuzi wa karibu wakupate." },
    tip: {
      en: "A GPS pin puts your shop on the map view of the public directory and enables directions.",
      sw: "Alama ya GPS huweka duka lako kwenye ramani ya orodha ya umma na kuwezesha maelekezo.",
    },
  },
  {
    id: 7,
    title: { en: "Review & Finish", sw: "Pitia & Maliza" },
    question: { en: "Does everything look right?", sw: "Je, kila kitu kipo sahihi?" },
    helper: { en: "Confirm your details before we create the shop.", sw: "Hakikisha taarifa ni sahihi kabla ya kusajili." },
    tip: {
      en: "You can change any of these settings later from your shop settings page.",
      sw: "Unaweza kubadilisha mipangilio hii yoyote baadaye kwenye ukurasa wa mipangilio ya duka.",
    },
  },
];

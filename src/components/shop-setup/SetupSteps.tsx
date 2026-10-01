import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { Store, Phone, Clock, FileText, Tag, Package, Users, CreditCard, ShoppingBag, Share2, ShieldCheck } from "lucide-react";

interface StepProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function BrandingStep({ formData, setFormData }: StepProps) {
  const { lang } = useI18n();
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{lang === 'sw' ? "Slogan ya Duka" : "Shop Slogan"}</Label>
        <Input 
          placeholder={lang === 'sw' ? "Mfn: Bei nafuu kila siku!" : "E.g: Best prices every day!"}
          value={formData.slogan || ""}
          onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>{lang === 'sw' ? "Maelezo ya Duka" : "Shop Description"}</Label>
        <Textarea 
          placeholder={lang === 'sw' ? "Elezea duka lako..." : "Describe your shop..."}
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
        />
      </div>
    </div>
  );
}

export function ContactStep({ formData, setFormData }: StepProps) {
  const { lang } = useI18n();
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{lang === 'sw' ? "Namba ya Simu" : "Phone Number"}</Label>
        <Input 
          type="tel"
          value={formData.phone || ""}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>WhatsApp Number</Label>
        <Input 
          type="tel"
          value={formData.whatsappNumber || ""}
          onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Website URL</Label>
        <Input 
          type="url"
          placeholder="https://"
          value={formData.website || ""}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
        />
      </div>
    </div>
  );
}

export function HoursStep({ formData, setFormData }: StepProps) {
  const { lang } = useI18n();
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{lang === 'sw' ? "Muda wa Kufungua na Kufunga" : "Operating Hours"}</Label>
        <Input 
          placeholder="08:00 AM - 08:00 PM"
          value={formData.operatingHours || ""}
          onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Timezone</Label>
        <Select 
          value={formData.timezone || "Africa/Dar_es_Salaam"} 
          onValueChange={(val) => setFormData({ ...formData, timezone: val })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Africa/Dar_es_Salaam">East Africa Time (EAT)</SelectItem>
            <SelectItem value="Africa/Kigali">Central Africa Time (CAT)</SelectItem>
            <SelectItem value="Africa/Lagos">West Africa Time (WAT)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function BusinessInfoStep({ formData, setFormData }: StepProps) {
  const { lang } = useI18n();
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{lang === 'sw' ? "Aina ya Biashara" : "Business Type"}</Label>
        <Input 
          placeholder="Retail, Wholesale, Services..."
          value={formData.businessType || ""}
          onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{lang === 'sw' ? "Nchi" : "Country"}</Label>
          <Input 
            value={formData.country || ""}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{lang === 'sw' ? "Mkoa" : "Region"}</Label>
          <Input 
            value={formData.region || ""}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{lang === 'sw' ? "Sarafu (Currency)" : "Currency"}</Label>
        <Select 
          value={formData.currency || "TZS"} 
          onValueChange={(val) => setFormData({ ...formData, currency: val })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TZS">TZS (Tanzanian Shilling)</SelectItem>
            <SelectItem value="KES">KES (Kenyan Shilling)</SelectItem>
            <SelectItem value="UGX">UGX (Ugandan Shilling)</SelectItem>
            <SelectItem value="USD">USD (US Dollar)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function PricingStep() {
  const { lang } = useI18n();
  return (
    <div className="text-center p-6 space-y-4">
      <Tag className="mx-auto h-16 w-16 text-primary/50" />
      <h3 className="text-lg font-bold">{lang === 'sw' ? "Usanidi wa Bei" : "Pricing Configuration"}</h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">
        {lang === 'sw' ? 
          "Unaweza kusanidi bei za jumla, rejareja, na punguzo baadae ndani ya dashibodi yako chini ya mipangilio ya bidhaa." : 
          "You can configure wholesale, retail, and discount rules later inside your dashboard under product settings."}
      </p>
    </div>
  );
}

export function InventoryStep({ formData, setFormData }: StepProps) {
  const { lang } = useI18n();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 border rounded-xl">
        <div className="space-y-0.5">
          <Label>{lang === 'sw' ? "Je, unaweka akiba ya mzigo?" : "Do you keep inventory stock?"}</Label>
          <p className="text-sm text-muted-foreground">
            {lang === 'sw' ? "Washa ikiwa utafuatilia idadi ya bidhaa." : "Enable if you want to track product quantities."}
          </p>
        </div>
        <Switch 
          checked={formData.keepsStock !== false} 
          onCheckedChange={(val) => setFormData({ ...formData, keepsStock: val })} 
        />
      </div>
    </div>
  );
}

export function CustomersStep() {
  const { lang } = useI18n();
  return (
    <div className="text-center p-6 space-y-4">
      <Users className="mx-auto h-16 w-16 text-primary/50" />
      <h3 className="text-lg font-bold">{lang === 'sw' ? "Wateja Wako" : "Your Customers"}</h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">
        {lang === 'sw' ? 
          "Wateja watajiongeza pindi utakapouza, au unaweza kuingiza orodha yao baadae kwenye mfumo." : 
          "Customers will be added automatically as you sell, or you can import them later via the dashboard."}
      </p>
    </div>
  );
}

export function PaymentStep() {
  const { lang } = useI18n();
  return (
    <div className="text-center p-6 space-y-4">
      <CreditCard className="mx-auto h-16 w-16 text-primary/50" />
      <h3 className="text-lg font-bold">{lang === 'sw' ? "Mbinu za Malipo" : "Payment Methods"}</h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">
        {lang === 'sw' ? 
          "Sanidi M-Pesa, Tigo Pesa, au Benki kwenye mipangilio ya duka lako baada ya kumaliza hatua hii." : 
          "Configure mobile money or bank accounts in your shop settings after finishing this setup."}
      </p>
    </div>
  );
}

export function OnlineStoreStep({ formData, setFormData }: StepProps) {
  const { lang } = useI18n();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 border rounded-xl">
        <div className="space-y-0.5">
          <Label>{lang === 'sw' ? "Kuonekana Sokoni" : "Marketplace Listing"}</Label>
          <p className="text-sm text-muted-foreground">
            {lang === 'sw' ? "Duka lako litaonekana kwenye Twende Duka baada ya msimamizi kuilidhinisha." : "Your shop appears on the marketplace once the platform admin approves it."}
          </p>
        </div>
        <Switch
          checked={formData.isPublic !== false}
          disabled
        />
      </div>
      <div className="space-y-2">
        <Label>{lang === 'sw' ? "Hali ya Bidhaa" : "Product Condition"}</Label>
        <Select 
          value={formData.productCondition || "new"} 
          onValueChange={(val) => setFormData({ ...formData, productCondition: val })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New Products (Mpya)</SelectItem>
            <SelectItem value="secondhand">Second-hand (Mitumba)</SelectItem>
            <SelectItem value="both">Both (Mpya na Mitumba)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function SocialCommerceStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Instagram Profile URL</Label>
        <Input 
          placeholder="https://instagram.com/yourshop"
          value={formData.instagramUrl || ""}
          onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Facebook Page URL</Label>
        <Input 
          placeholder="https://facebook.com/yourshop"
          value={formData.facebookUrl || ""}
          onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>TikTok Profile URL</Label>
        <Input 
          placeholder="https://tiktok.com/@yourshop"
          value={formData.tiktokUrl || ""}
          onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })}
        />
      </div>
    </div>
  );
}

export function StaffStep() {
  const { lang } = useI18n();
  return (
    <div className="text-center p-6 space-y-4">
      <ShieldCheck className="mx-auto h-16 w-16 text-primary/50" />
      <h3 className="text-lg font-bold">{lang === 'sw' ? "Ongeza Wafanyakazi" : "Add Staff Members"}</h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">
        {lang === 'sw' ? 
          "Unaweza kuwaalika wasaidizi wako na kuwapa ruhusa maalum kupitia paneli ya Wafanyakazi mara baada ya kumaliza hapa." : 
          "You can invite assistants and assign them specific permissions via the Staff panel once you finish here."}
      </p>
    </div>
  );
}

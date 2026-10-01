import { useProducts } from "@/hooks/useProducts";
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchShops } from '@/store/shopsSlice';

export const useUserJourney = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const shops = useAppSelector((s) => s.shops.shops);
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const { data: products = [] } = useProducts(currentShopId);
  
  const shopsCount = shops.length;
  const productsCount = products.length;

  // The Django shop serializer computes ``productCount`` server-side, so a
  // re-fetch of the shops list is all this needs to do.
  const handleSync = async () => {
    if (!currentShopId) return;
    if (user?.id) {
      dispatch(fetchShops(user.id));
    }
  };
  
  const PRODUCT_GOAL = 2;
  const productProgress = Math.min(productsCount, PRODUCT_GOAL);

  const milestones = [
    { 
      id: 'register', 
      label: 'Karibu Twende Duka', 
      status: 'completed',
      description: 'Akaunti yako imekamilika.'
    },
    { 
      id: 'create-shop', 
      label: 'Duka la Kwanza', 
      status: shopsCount > 0 ? 'completed' : 'active',
      description: shopsCount > 0 ? 'Duka limefunguliwa!' : 'Fungua duka lako sasa.'
    },
    { 
      id: 'add-products', 
      label: `Bidhaa 10+ (${productProgress}/${PRODUCT_GOAL})`, 
      status: productsCount >= PRODUCT_GOAL ? 'completed' : (shopsCount > 0 ? 'active' : 'pending'),
      progress: (productProgress / PRODUCT_GOAL) * 100,
      description: productsCount >= PRODUCT_GOAL ? 'Bidhaa za kutosha!' : 'Ongeza bidhaa ili duka lionekane.'
    },
    { 
      id: 'go-public', 
      label: 'Duka Lipo Mtandaoni', 
      status: productsCount >= PRODUCT_GOAL ? 'completed' : 'pending',
      description: productsCount >= PRODUCT_GOAL ? 'Duka lako sasa ni la umma!' : 'Duka lako bado ni la faragha.'
    },
  ];

  const isPublic = productsCount >= PRODUCT_GOAL;
  const totalCompleted = milestones.filter(m => m.status === 'completed').length;
  const progressPercent = (totalCompleted / milestones.length) * 100;

  return { milestones, isPublic, productProgress, PRODUCT_GOAL, progressPercent, handleSync };
};

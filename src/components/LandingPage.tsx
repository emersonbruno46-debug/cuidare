import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { 
  Scissors, Sparkles, Heart, Clock, MapPin, Instagram, Phone, 
  Star, ShieldCheck, Menu, X, ArrowRight
} from 'lucide-react';
import { services } from '../data/servicesData';
import { professionals } from '../data/professionalsData';
import type { Service } from '../types';

gsap.registerPlugin(ScrollTrigger, Flip);

interface LandingPageProps {
  onOpenBooking: (service?: Service) => void;
  onNavigateToAdmin: () => void;
}

// Cuidare SVG Logo Component
const Logo = ({ className = "h-12 w-auto" }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29700 21000" fill="currentColor">
    <path className="fill-current" d="M6217.41 17444.27c-189.15,329.07 -548.76,532.63 -1003.39,532.63 -410.49,0 -736.19,-131.46 -972.84,-391.85 -236.63,-259.54 -355.36,-616.61 -355.36,-1074.61 0,-455.47 118.73,-815.09 355.36,-1074.62 236.65,-260.39 560.04,-405.86 967.76,-391.86 568.85,19.53 1139.94,837.17 1139.94,589.47l0 -14.42c0,-247.66 -134.02,-465.64 -399.5,-653.92 -268.01,-186.6 -603.89,-280.75 -1004.23,-280.75 -539.41,0 -994.87,176.42 -1360.45,528.41 -364.69,351.99 -548.74,785.39 -548.74,1302.77 0,522.46 186.6,955.88 558.93,1300.23 372.35,346.91 827.81,520.77 1365.55,520.77 325.69,0 614.06,-64.46 869.36,-195.93 253.59,-128.92 436.8,-297.71 548.75,-502.95l-161.14 -193.37zm9674.52 -10724.78c-52.86,-389.98 -279.55,-670.81 -555.83,-859.44 -513.41,-350.53 -727.19,-729.73 -819.67,-1308.26 -8.3,-51.94 -7.39,-59.89 -23.78,-111.69 -35.2,-111.32 -15.38,-56.19 -46.62,-104.35 -235.69,1634.91 1177.83,1446.2 1215.09,2636.35 13.53,432.59 -118.26,777.1 -251.44,1153.78 97.37,-67.99 10.82,2.64 80.62,-75.41 310.46,-347.16 321.98,-729.07 499.12,-1000.47 77.88,-119.33 146.33,-203.94 205,-359.46 435.99,-1155.21 219.34,-1720.84 -527.13,-2371.36 -483.84,-421.65 -760.23,-587.55 -1004.42,-1213.26 -100.94,-258.72 -138.97,-816.35 -201.46,-918.82 -111.95,452.14 -77.97,946.13 104.04,1342.87 445.83,971.89 1196.66,1016.78 1446.59,1781.17 106.76,326.47 88.26,744.46 21.58,1092.86 -26,135.82 -54.25,221.93 -141.69,315.49zm-4971.28 3065.35c-237.11,-278.41 -469.9,-698 -636.23,-1158.17 -125.15,-346.3 -330.54,-1031.2 -310.03,-1424.85 508.97,7.07 1489.73,507.36 1981.32,755.48 192.05,96.93 343.62,259.36 542.39,329.3 -209.23,-507.85 -2628.47,-1791.79 -3030.22,-1730.92 -86.33,471.62 72.21,1317.75 218.18,1745.07 248.39,727.05 809.16,1319.03 856.73,1477.49 -544.26,16.98 -1759.05,280.91 -2213.16,467.4 -127.14,52.23 -547.38,189.19 -621.89,253.86 94.92,434.61 1208.51,1178.22 1618.59,1465.89 832.07,583.73 2538.27,1445.25 4024.26,524.73 -286.92,42.08 -1479.47,409.71 -2899.77,-266.8 -389.94,-185.72 -1790.36,-1110.55 -1897.63,-1561.73 187.54,-61.25 405.21,-145.47 607.4,-211.28 2345.96,-763.52 1272.06,-144.96 2845.42,383.64 266.61,105.12 973.29,366.07 1233.53,216.72 -135.86,-62.76 -503.94,-98.23 -714.74,-177.53 -638.69,-240.28 -1157.41,-563.81 -1604.15,-1088.3zm6978.99 -1517.51c630.96,-311.85 1185.34,-625.31 1855.86,-928.48 189.81,-71.38 510.98,-222.99 702.96,-144.6 10.07,432.17 -205.85,1097.51 -341.03,1481.12 -385.92,1095.15 -1198.69,1841.59 -2281.2,2218.28 -147.5,51.33 -627.62,133.84 -684.9,166.22 248.29,158.96 1016.08,-133.98 1261.1,-224.25 369.25,-136.01 522.4,-254.74 800.61,-450.34 311.16,-218.78 339.58,-404.85 825.2,-278.93 867.84,225.02 1028.36,294.11 1853.25,551.45 -39,284.09 -388.38,520.8 -646.22,751.43 -2734.44,1787.71 -3816.49,916.09 -4203.11,1118.66 370.83,279.49 1244.48,345.27 1766.01,305.79 642.05,-48.6 1102.95,-219.47 1632.39,-457.22 668.62,-300.22 752.59,-485.12 1275.54,-811.67 182.84,-114.2 970.53,-849.75 1035.25,-1062.12 -1335.27,-721.84 -2725.23,-637.4 -2862.65,-731.35 1.36,-27.71 664.61,-1144.07 763.24,-1424.5 139.77,-397.43 408.13,-1406.8 315.39,-1843.38 -551.24,25.48 -2775.63,1216.4 -3067.69,1763.89zm-3010.39 1342.78c-31.86,-1057.1 233.22,-3057.63 -1150.82,-3283.81 -438.09,-71.61 -913.69,-10.63 -1158.05,-324.55 -158.86,-340.23 374.17,-391.03 160.25,-725.12 -71.93,-112.31 -75.09,-98.78 -138.25,-259.97l296.09 -213.46c-60,-133.32 -79.13,-110.58 -159.53,-203.57 45.15,-239.7 193.4,-252.37 165.31,-423.2 -29.88,-181.71 -160.63,-228.25 -191.29,-494.16 463.48,-139.07 678.38,-227.4 919.45,-520.29 124.76,-151.56 312.96,-1070.57 185.69,-1209.47 -165.34,309.56 -95.85,823.01 -344.44,1131.32 -246.93,306.24 -677.34,230.53 -1020.42,465.71 -44.31,276.48 18.09,311.35 146.94,455.28 229.43,256.27 57,282.16 0.6,457.89 -49.06,152.84 12.48,136.52 14.08,262.5 2.35,184.16 -26.16,84.41 -91.22,229.96 -77.62,173.62 63.15,280.94 138.38,447.24 -109.06,221.26 -516.88,527.85 118.47,915.42 300.09,183.06 835.46,135.2 1203.91,327 739.75,385.08 789.48,2432.73 666.96,3181.27 -84.42,515.65 -575.55,523.69 -675.49,1616.65 -42.78,468.05 110.57,897.38 333.72,1203.84 156.16,214.46 513.46,638.2 867.65,693.31 -78.75,-244.77 -915.1,-832.51 -772.47,-1800.34 145.65,-988.48 1757.05,-2404.4 2523.76,-3198.95 309.52,-367.54 578.95,-780.51 851.82,-1310.67 322.79,-627.13 350.77,-1470.61 184.69,-2194.93 -144.9,-631.89 -608.52,-1174.01 -1126,-1524.18 -234.72,-158.86 -558.88,-318.02 -815.31,-471.83 -644.56,-386.63 -1014.8,-647.38 -1381.9,-1283.14 -189.78,-328.65 -225.98,-627.04 -379.48,-934.38 -304.23,318.09 463.86,1644.13 862.94,1944.16 2747.13,2089.36 3226.02,4762.52 -236.04,7044.47zm7020.06 10756.95l77.33 0 79.23 -176.62 363.72 0 78.28 176.62 81.15 0 -304.54 -673.02 -70.63 0 -304.54 673.02zm186.16 -244.39l152.74 -340.81 151.79 340.81 -304.53 0zm-1178.99 244.39l535.55 0 0 -67.78 -433.4 0 433.4 -549.87 0 -50.6 -521.23 0 0 67.78 418.13 0 -432.45 549.87 0 50.6zm-967.05 0l487.82 0 0 -68.74 -412.4 0 0 -233.88 364.66 0 0 -68.74 -364.66 0 0 -228.16 407.62 0 0 -68.73 -483.04 0 0 668.25zm-945.09 0l451.54 0 0 -69.69 -376.13 0 0 -598.56 -75.41 0 0 668.25zm-997.6 0l487.81 0 0 -68.74 -412.39 0 0 -233.88 364.66 0 0 -68.74 -364.66 0 0 -228.16 407.62 0 0 -68.73 -483.04 0 0 668.25zm-1047.25 0l296.9 0c146.07,0 242.48,-67.78 242.48,-182.34l0 -1.9c0,-90.7 -63.97,-138.43 -143.19,-161.34 52.5,-22.91 105.96,-67.78 105.96,-154.66l0 -1.9c0,-41.05 -14.32,-77.33 -42.96,-106.93 -38.19,-37.22 -98.33,-59.18 -174.7,-59.18l-284.49 0 0 668.25zm425.78 -489.73c0,79.23 -62.05,119.33 -153.71,119.33l-197.6 0 0 -230.07 203.34 0c95.46,0 147.97,42.96 147.97,108.83l0 1.91zm37.23 302.62c0,75.41 -62.05,119.33 -164.2,119.33l-224.34 0 0 -235.79 210.97 0c117.42,0 177.57,42 177.57,114.55l0 1.91zm-2104.98 187.11l487.81 0 0 -68.74 -412.41 0 0 -233.88 364.68 0 0 -68.74 -364.68 0 0 -228.16 407.63 0 0 -68.73 -483.03 0 0 668.25zm-1104.53 0l231.98 0c210.02,0 355.13,-146.06 355.13,-334.13l0 -1.9c0,-188.07 -145.11,-332.22 -355.13,-332.22l-231.98 0 0 668.25zm231.98 -598.56c168.96,0 276.84,116.46 276.84,264.43l0 1.92c0,148.92 -107.88,262.52 -276.84,262.52l-156.56 0 0 -528.87 156.56 0zm-1735.54 610.01c203.34,0 341.76,-161.33 341.76,-345.58l0 -1.9c0,-184.25 -136.51,-343.67 -339.85,-343.67 -203.34,0 -341.76,161.32 -341.76,345.57l0 1.92c0,184.25 136.52,343.66 339.85,343.66zm1.91 -69.69c-152.74,0 -263.49,-124.1 -263.49,-275.89l0 -1.9c0,-151.79 108.84,-273.99 261.58,-273.99 152.75,0 263.48,124.1 263.48,275.89l0 1.92c0,151.79 -108.83,273.97 -261.57,273.97zm-941.27 58.24l75.42 0 0 -668.25 -75.42 0 0 668.25zm-1111.2 0l231.98 0c210.01,0 355.11,-146.06 355.11,-334.13l0 -1.9c0,-188.07 -145.1,-332.22 -355.11,-332.22l-231.98 0 0 668.25zm231.98 -598.56c168.96,0 276.84,116.46 276.84,264.43l0 1.92c0,148.92 -107.88,262.52 -276.84,262.52l-156.58 0 0 -528.87 156.58 0zm-1047.25 609.06c167.06,0 278.76,-100.23 278.76,-295.93l0 -382.82 -75.42 0 0 388.54c0,146.07 -78.29,220.52 -201.44,220.52 -128.87,0 -204.29,-80.19 -204.29,-225.29l0 -383.77 -75.42 0 0 388.54c0,189.02 112.65,290.21 277.81,290.21zm-1063.47 -10.5l75.41 0 0 -598.56 225.29 0 0 -69.69 -526 0 0 69.69 225.3 0 0 598.56zm-903.1 9.55c132.7,0 228.16,-74.47 228.16,-189.02l0 -1.92c0,-102.14 -68.74,-155.6 -217.66,-189.01 -147.96,-30.55 -181.38,-66.82 -181.38,-129.84l0 -1.9c0,-61.1 54.41,-107.88 142.25,-107.88 68.72,0 130.78,21.96 192.84,72.55l43.91 -58.23c-68.74,-54.41 -136.52,-82.1 -234.85,-82.1 -126.96,0 -219.57,78.28 -219.57,182.34l0 1.91c0,109.78 70.65,159.42 224.35,192.83 140.33,30.56 173.74,64.92 173.74,126.97l0 1.91c0,65.87 -58.23,113.6 -148.93,113.6 -92.59,0 -159.42,-30.54 -229.11,-94.51l-46.78 55.37c80.19,72.55 166.11,106.93 273.03,106.93zm9263.85 -3219.87l589.49 -1374.03 596.25 1374.03 -525.44 0 -251.74 274.8 898.47 0 370.64 860.03 877 0 -1558.07 -3562.28 -280.75 0 -1560.61 3562.28 355.38 0 361.65 -833.43 11.54 -26.6 116.19 -274.8zm5732.73 81.42c-94.99,-226.47 -270.57,-374.9 -529.25,-446.99 265.46,-72.1 476.66,-196.78 636.11,-375.73 156.07,-178.97 235.8,-387.61 235.8,-628.49 0,-308.74 -129.77,-562.34 -387.61,-760.8 -258.7,-197.62 -578.45,-296.86 -960.99,-296.86l-1536.87 0 0 3562.28 829.53 0 0 -1441.02 586.09 0c76.31,52.58 138.23,128.92 185.72,226.44l422.4 918.57c59.36,131.47 134,230.7 225.6,296.01l893.97 0c-106.88,-72.09 -201.01,-201.86 -285.83,-387.61l-314.67 -665.8zm-1199.3 -2234.07c210.34,0 377.44,72.11 503.81,216.3 126.36,144.17 188.28,335.02 188.28,571.65 0,238.32 -61.92,430.02 -188.28,571.66 -126.37,141.64 -293.47,213.73 -503.81,213.73l-513.98 0 0 -1573.34 513.98 0zm3173.81 1617.45l1358.76 0 0 -273.1 -1358.76 0 0 -1344.35 1766.72 0 0 -274.8 -2596.23 0 0 3562.28 2645.43 0 0 -274.8 -1815.92 0 0 -1395.23zm-16170.2 1714.98c449.54,0 803.23,-122.14 1059.37,-365.55 255.29,-242.57 381.67,-569.98 381.67,-984.72l0 -2256.96 -295.17 0 0 2229.82c0,302.79 -83.96,543.67 -256.15,719.23 -171.32,178.97 -405.42,268.02 -701.41,268.02 -305.35,0 -547.07,-89.05 -726.04,-268.02 -181.5,-178.09 -270.55,-418.97 -270.55,-719.23l0 -2229.82 -829.52 0 0 2150.95c0,433.4 154.39,783.7 462.25,1050.86 307.04,271.42 700.59,405.42 1175.55,405.42zm3116.16 -44.95l0 -3562.28 -829.51 0 0 3562.28 829.51 0zm920.24 -3562.28l0 3562.28 1459.7 0c556.4,0 1023.72,-170.49 1398.62,-510.6 374.88,-340.95 561.47,-765.88 561.47,-1270.53 0,-504.66 -186.59,-929.59 -561.47,-1270.55 -374.9,-340.11 -842.22,-510.6 -1398.62,-510.6l-1459.7 0zm829.51 3287.48l0 -3012.68 543.67 0c360.47,0 648,136.57 869.37,412.22 218.82,276.5 327.4,639.51 327.4,1094.13 0,454.6 -108.58,820.16 -327.4,1094.12 -221.37,275.64 -508.9,412.21 -869.37,412.21l-543.67 0z"/>
  </svg>
);

export default function LandingPage({ onOpenBooking, onNavigateToAdmin }: LandingPageProps) {
  const [activeCategory, setActiveCategory] = useState<string>('escovas');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const heroImageRef = useRef<HTMLDivElement>(null);
  const conceptRef = useRef<HTMLDivElement>(null);

  // Group services by category
  const categories = [
    { id: 'escovas', name: 'Escovas & Modelagem', icon: Scissors },
    { id: 'tratamentos', name: 'Tratamentos', icon: Heart },
    { id: 'quimicas', name: 'Químicas', icon: Sparkles },
    { id: 'unhas', name: 'Manicure & Pedicure', icon: Sparkles },
    { id: 'sobrancelhas', name: 'Sobrancelhas', icon: Star },
    { id: 'cilios', name: 'Cílios', icon: Sparkles },
    { id: 'maquiagem', name: 'Maquiagem', icon: Sparkles },
    { id: 'estetica', name: 'Estética & Massagem', icon: Heart },
  ];

  const filteredServices = services.filter(s => s.category === activeCategory);

  const getServiceFormattedPrice = (service: Service) => {
    if (service.variablePrice) {
      if (service.priceRange) {
        return `A partir de R$ ${service.priceRange.min},00`;
      }
      if (service.priceDetails) {
        return `A partir de R$ ${service.priceDetails.P},00`;
      }
      return `A partir de R$ ${service.priceBase},00`;
    }
    return `R$ ${service.priceBase},00`;
  };

  // Scroll effect for Navbar (Progressive Blur logic)
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // GSAP Animations
  useGSAP(() => {
    const tl = gsap.timeline();
    
    // Hero Animations
    if (heroContentRef.current && heroImageRef.current) {
      tl.fromTo(heroImageRef.current, { scale: 1.05, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.5, ease: 'power3.out' })
        .fromTo('.hero-eyebrow', { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' }, '-=1')
        .fromTo('.hero-h1', { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' }, '-=0.6')
        .fromTo('.hero-p', { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' }, '-=0.6')
        .fromTo('.hero-cta', { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out', stagger: 0.1 }, '-=0.6')
        .fromTo('.hero-prof', { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'power3.out', stagger: 0.15 }, '-=0.8');
    }

    // Concept Section reveal
    if (conceptRef.current) {
      gsap.fromTo(
        '.concept-reveal',
        { y: 30, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.9,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: conceptRef.current,
            start: 'top 75%',
          }
        }
      );
    }
  }, { scope: heroRef });

  return (
    <div className="min-h-screen bg-canvas relative selection:bg-champagne selection:text-white">
      
      {/* HEADER / NAVBAR */}
      <nav 
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-[#FCFAF7]/80 backdrop-blur-md border-b border-border-subtle h-[76px]' 
            : 'bg-transparent border-b border-transparent h-[82px]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo className={`h-10 w-auto transition-colors ${scrolled ? 'text-espresso' : 'text-espresso'}`} />
            <span className={`font-serif tracking-widest font-bold text-lg hidden sm:block ${scrolled ? 'text-espresso' : 'text-espresso'}`}>CUIDARE</span>
          </div>

          {/* Desktop Nav - Text Roll Navigation Effect (CSS based hover) */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#sobre" className="text-sm font-medium text-text-secondary hover:text-espresso transition-colors">O Espaço</a>
            <a href="#servicos" className="text-sm font-medium text-text-secondary hover:text-espresso transition-colors">Serviços</a>
            <a href="#profissionais" className="text-sm font-medium text-text-secondary hover:text-espresso transition-colors">Profissionais</a>
            <a href="#horarios" className="text-sm font-medium text-text-secondary hover:text-espresso transition-colors">Horários & Local</a>
            <button 
              onClick={() => onOpenBooking()}
              className="px-6 h-10 bg-espresso text-white text-sm font-medium rounded-md hover:bg-deep-espresso transition-all duration-300 active:scale-95 shadow-sm"
            >
              Agendar horário
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-espresso p-2">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden bg-paper/95 backdrop-blur-lg border-b border-border-subtle px-4 pt-2 pb-6 flex flex-col gap-4 absolute w-full top-[100%]"
            >
              <a href="#sobre" onClick={() => setMobileMenuOpen(false)} className="text-text-primary py-2 font-medium border-b border-border-subtle">O Espaço</a>
              <a href="#servicos" onClick={() => setMobileMenuOpen(false)} className="text-text-primary py-2 font-medium border-b border-border-subtle">Serviços</a>
              <a href="#profissionais" onClick={() => setMobileMenuOpen(false)} className="text-text-primary py-2 font-medium border-b border-border-subtle">Profissionais</a>
              <a href="#horarios" onClick={() => setMobileMenuOpen(false)} className="text-text-primary py-2 font-medium border-b border-border-subtle">Horários & Local</a>
              <button 
                onClick={() => { setMobileMenuOpen(false); onOpenBooking(); }}
                className="w-full h-12 bg-espresso text-white font-medium rounded-md mt-2"
              >
                Agendar Horário
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* HERO SECTION: Editorial Beauty Composition */}
      <section 
        ref={heroRef}
        className="relative pt-[120px] pb-16 lg:pb-0 min-h-screen lg:min-h-0 lg:h-screen flex items-center bg-canvas overflow-hidden"
      >
        {/* Background Fachada (Soft integration) */}
        <div ref={heroImageRef} className="absolute inset-0 z-0">
          <img src="/BACKGROUND HERO.png" alt="Fachada" className="w-full h-full object-cover opacity-[0.15]" />
          <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/90 to-transparent lg:w-2/3" />
          <div className="absolute inset-0 bg-gradient-to-t from-canvas via-transparent to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 grid lg:grid-cols-12 gap-8 items-center h-full">
          
          {/* TEXT CONTENT (5-6 columns) */}
          <div ref={heroContentRef} className="lg:col-span-5 flex flex-col items-start pt-8 lg:pt-0">
            <span className="hero-eyebrow text-xs uppercase tracking-[0.2em] text-taupe font-semibold mb-4 lg:mb-6 block">
              Cuidare Espaço de Beleza e Saúde
            </span>
            <h1 className="hero-h1 text-[42px] sm:text-[52px] lg:text-[clamp(58px,5vw,82px)] font-serif text-espresso leading-[1.05] mb-6">
              Beleza, cuidado e praticidade em um só lugar.
            </h1>
            <p className="hero-p text-text-secondary text-base lg:text-[17px] leading-relaxed mb-8 max-w-[90%]">
              Agende online de forma rápida e segura seu horário com nossas profissionais. Escolha seu serviço e desfrute de uma experiência editorial e precisa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button onClick={() => onOpenBooking()} className="hero-cta h-[52px] px-8 bg-espresso text-white font-medium rounded-md flex items-center justify-center gap-2 hover:bg-deep-espresso transition-colors">
                Agendar meu horário <ArrowRight size={16} />
              </button>
              <a href="#servicos" className="hero-cta h-[52px] px-8 border border-border-strong text-text-primary font-medium rounded-md flex items-center justify-center hover:bg-black/5 transition-colors">
                Conhecer os serviços
              </a>
            </div>
          </div>

          {/* HUMAN VISUAL (6-7 columns) - Modular API for future real photos */}
          <div className="lg:col-span-7 relative h-full min-h-[400px] lg:min-h-full flex items-end justify-center lg:justify-end mt-12 lg:mt-0">
            
            {/* 
              FUTURE ASSET API STRUCTURE: 
              Separated wrappers for easy cutouts swapping.
              Currently using the group image as a fallback, but placed cleanly.
            */}
            <div className="relative w-full max-w-[600px] lg:max-w-none lg:w-[120%] lg:-mr-[10%] flex items-end justify-center hero-prof">
              <img 
                src="/PROFISSIONAIS.png" 
                alt="Profissionais Cuidare" 
                className="w-full h-auto object-contain object-bottom origin-bottom mix-blend-multiply" 
                style={{ objectPosition: 'center bottom', transform: 'scale(1.02)' }}
              />
              {/* Subtle contact shadow simulation */}
              <div className="absolute bottom-0 w-[80%] h-4 bg-black/10 blur-xl rounded-full" />
            </div>

          </div>
        </div>
      </section>

      {/* CONCEPT SECTION: Editorial Spread */}
      <section id="sobre" ref={conceptRef} className="py-24 bg-paper relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            
            {/* Copy (42-50%) */}
            <div className="lg:w-[45%] order-2 lg:order-1 concept-reveal">
              <h2 className="text-[36px] sm:text-[46px] lg:text-[clamp(44px,4vw,64px)] font-serif text-espresso leading-tight mb-8">
                Um conceito completo de cuidado para você.
              </h2>
              <p className="text-text-secondary text-base lg:text-[17px] leading-relaxed mb-10">
                O Cuidare Studio foi planejado para atender todas as demandas na área de beleza e bem-estar em um único endereço. Uma infraestrutura de ponta unida a uma equipe altamente capacitada para proporcionar conforto absoluto.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-12">
                <div className="flex items-start gap-4">
                  <span className="text-5xl font-serif text-champagne leading-none mt-1">04</span>
                  <span className="text-sm font-medium text-taupe uppercase tracking-wider leading-snug pt-1">
                    Andares dedicados<br/>ao cuidado
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-success" size={24} />
                  <span className="text-sm font-medium text-text-secondary">
                    100% nas normas<br/>da vigilância sanitária
                  </span>
                </div>
              </div>
            </div>

            {/* Main Image (50-58%) */}
            <div className="lg:w-[55%] order-1 lg:order-2 w-full concept-reveal">
              <div className="aspect-[4/5] sm:aspect-square lg:aspect-[4/5] w-full overflow-hidden bg-warm-surface relative">
                <img 
                  src="/BACKGROUND HERO.png" 
                  alt="Estrutura Cuidare" 
                  className="w-full h-full object-cover mix-blend-multiply opacity-90"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section id="servicos" className="py-24 bg-canvas">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <h2 className="text-[36px] lg:text-[48px] font-serif text-espresso mb-4">Nossos Serviços</h2>
            <p className="text-text-secondary max-w-2xl text-[17px]">Explore nosso menu de procedimentos e agende seu horário com precisão.</p>
          </div>

          {/* Premium Navigation Rail */}
          <div className="flex overflow-x-auto gap-1 mb-10 border-b border-border-subtle no-scrollbar pb-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`relative px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive ? 'text-espresso' : 'text-taupe hover:text-espresso'
                  }`}
                >
                  {cat.name}
                  {isActive && (
                    <motion.div 
                      layoutId="serviceTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-espresso"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Clean Table/List Hybrid */}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredServices.map((service) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  key={service.id}
                  className="group flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-6 bg-paper hover:bg-white border border-border-subtle transition-colors rounded-sm gap-4"
                >
                  <div className="md:w-1/2">
                    <h4 className="text-lg font-sans font-medium text-espresso mb-1">
                      {service.name}
                    </h4>
                    <p className="text-text-secondary text-sm font-light leading-relaxed">
                      {service.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12 md:w-1/2">
                    <div className="text-sm text-taupe flex flex-col">
                      <span className="md:hidden text-[10px] uppercase tracking-wider mb-0.5 font-semibold text-text-secondary">Duração</span>
                      {service.duration} min
                    </div>
                    
                    <div className="text-right flex flex-col min-w-[100px]">
                      <span className="md:hidden text-[10px] uppercase tracking-wider mb-0.5 font-semibold text-text-secondary text-left">Valor</span>
                      <span className="font-sans font-medium text-espresso">
                        {getServiceFormattedPrice(service)}
                      </span>
                    </div>

                    <button
                      onClick={() => onOpenBooking(service)}
                      className="px-4 py-2 border border-border-strong text-espresso text-xs font-semibold uppercase hover:bg-espresso hover:text-white transition-colors"
                    >
                      Agendar
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          <p className="text-[11px] text-taupe mt-8 uppercase tracking-widest text-center">
            * Valores de referência, sujeitos à avaliação.
          </p>
        </div>
      </section>

      {/* PROFESSIONALS SECTION */}
      <section id="profissionais" className="py-24 bg-paper border-t border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 max-w-2xl">
            <h2 className="text-[36px] lg:text-[48px] font-serif text-espresso mb-4">Nossa Equipe</h2>
            <p className="text-text-secondary text-[17px]">Especialistas dedicadas a oferecer o melhor atendimento.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {professionals.map((prof) => (
              <div key={prof.id} className="flex flex-col">
                {/* 
                  Fallback portrait setup - ready for 4:5 real photos. 
                  Using a clean typographic placeholder for now to avoid fake feeling.
                */}
                <div className="aspect-[4/5] bg-warm-surface flex flex-col justify-end p-6 relative border border-border-subtle group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent mix-blend-multiply pointer-events-none" />
                  
                  {/* Big Initial as temporary elegant graphic */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] group-hover:scale-105 transition-transform duration-700 pointer-events-none">
                    <span className="text-[250px] font-serif leading-none">{prof.name[0]}</span>
                  </div>

                  <div className="relative z-10 bg-white p-5 shadow-sm border border-border-subtle">
                    <h3 className="text-xl font-serif text-espresso mb-1">{prof.name}</h3>
                    <span className="text-xs uppercase font-medium text-taupe block mb-4 tracking-wider">{prof.role}</span>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {prof.specialties.slice(0,2).map((spec, i) => (
                        <span key={i} className="text-[10px] px-2 py-1 bg-canvas text-text-secondary rounded-sm font-medium border border-border-subtle">
                          {spec}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => onOpenBooking(undefined)}
                      className="text-sm font-medium text-espresso flex items-center gap-2 hover:text-champagne transition-colors"
                    >
                      Agendar com {prof.name.split(' ')[0]} <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOCATION & HOURS */}
      <section id="horarios" className="py-24 bg-canvas border-t border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
            
            {/* Image (55-60%) */}
            <div className="lg:w-[55%]">
              <div className="aspect-[4/3] bg-warm-surface overflow-hidden">
                <img src="/BACKGROUND HERO.png" alt="Ambiente Cuidare" className="w-full h-full object-cover opacity-80 mix-blend-multiply" />
              </div>
            </div>

            {/* Info (40-45%) */}
            <div className="lg:w-[45%] flex flex-col justify-center">
              <h2 className="text-[36px] lg:text-[44px] font-serif text-espresso mb-10 leading-tight">Onde cuidar de você.</h2>
              
              <div className="space-y-8">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-taupe mb-3 flex items-center gap-2"><MapPin size={16}/> Endereço</h4>
                  <p className="text-text-primary text-[17px] font-medium">Rua Paracatu, 15, Centro</p>
                  <p className="text-text-secondary mt-1">Taiobeiras - MG</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-taupe mb-3 flex items-center gap-2"><Clock size={16}/> Horários</h4>
                  <ul className="space-y-3 text-[15px]">
                    <li className="flex justify-between border-b border-border-subtle pb-2">
                      <span className="text-text-secondary">Segunda</span>
                      <span className="text-taupe uppercase text-xs font-semibold mt-0.5">Fechado</span>
                    </li>
                    <li className="flex justify-between border-b border-border-subtle pb-2">
                      <span className="text-text-secondary">Terça a Sexta</span>
                      <span className="text-text-primary font-medium text-right leading-tight">08:00 - 11:00<br/>14:00 - 18:00</span>
                    </li>
                    <li className="flex justify-between pb-2">
                      <span className="text-text-secondary">Sábado</span>
                      <span className="text-text-primary font-medium">08:00 - 18:00</span>
                    </li>
                  </ul>
                </div>

                <div className="flex gap-4 pt-4">
                  <a href="#" className="flex items-center justify-center w-12 h-12 rounded-full border border-border-strong text-espresso hover:bg-espresso hover:text-white transition-colors">
                    <Instagram size={20} />
                  </a>
                  <a href="#" className="flex items-center justify-center w-12 h-12 rounded-full border border-border-strong text-espresso hover:bg-espresso hover:text-white transition-colors">
                    <Phone size={20} />
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-deep-espresso py-24 lg:py-32 relative overflow-hidden flex flex-col items-center justify-center min-h-[480px]">
        {/* Very subtle glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(198,162,95,0.08)_0%,transparent_60%)] pointer-events-none" />
        
        <div className="max-w-3xl mx-auto px-4 text-center z-10 relative">
          <h2 className="text-[40px] sm:text-[56px] font-serif text-white mb-6 leading-tight">
            Seu momento de cuidado começa aqui.
          </h2>
          <p className="text-[#C8C2BE] text-base lg:text-[19px] leading-relaxed mb-10 max-w-2xl mx-auto font-light">
            Escolha o serviço, encontre o melhor horário disponível e agende seu momento de cuidado com total exclusividade.
          </p>
          <button
            onClick={() => onOpenBooking()}
            className="h-14 px-10 bg-white text-espresso font-medium hover:bg-paper transition-colors rounded-sm"
          >
            Agendar meu horário
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-espresso pt-16 pb-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
            <Logo className="h-8 w-auto text-white" />
            <div className="flex flex-wrap gap-6 text-[13px] text-[#A69E9A]">
              <a href="#sobre" className="hover:text-white transition-colors">O Espaço</a>
              <a href="#servicos" className="hover:text-white transition-colors">Serviços</a>
              <a href="#profissionais" className="hover:text-white transition-colors">Equipe</a>
              <a href="#horarios" className="hover:text-white transition-colors">Contato</a>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-white/10 text-[11px] text-[#7A716C] uppercase tracking-widest">
            <span>© 2026 Cuidare Espaço de Beleza.</span>
            <button 
              onClick={onNavigateToAdmin}
              className="hover:text-white transition-colors underline underline-offset-4"
            >
              Acesso Restrito
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

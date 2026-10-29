import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { 
  Sparkles, Clock, MapPin, Instagram, Phone, 
  ShieldCheck, Menu, X, ArrowRight
} from 'lucide-react';
import { services } from '../data/servicesData';
import { professionals as defaultProfessionals } from '../data/professionalsData';
import { CATEGORIES } from '../data/categoriesData';
import type { Service, Professional } from '../types';
import { getBusinessSettings } from '../lib/businessSettings';
import PrivacyPolicyModal from './PrivacyPolicyModal';

gsap.registerPlugin(ScrollTrigger, Flip);

interface LandingPageProps {
  onOpenBooking: (options?: { service?: Service; professional?: Professional } | Service) => void;
  onNavigateToAdmin: () => void;
  professionals?: Professional[];
}

// Cuidare SVG Logo Component
const Logo = ({ className = "h-12 w-auto" }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29700 21000" fill="currentColor">
    <path className="fill-current" d="M6217.41 17444.27c-189.15,329.07 -548.76,532.63 -1003.39,532.63 -410.49,0 -736.19,-131.46 -972.84,-391.85 -236.63,-259.54 -355.36,-616.61 -355.36,-1074.61 0,-455.47 118.73,-815.09 355.36,-1074.62 236.65,-260.39 560.04,-405.86 967.76,-391.86 568.85,19.53 1139.94,837.17 1139.94,589.47l0 -14.42c0,-247.66 -134.02,-465.64 -399.5,-653.92 -268.01,-186.6 -603.89,-280.75 -1004.23,-280.75 -539.41,0 -994.87,176.42 -1360.45,528.41 -364.69,351.99 -548.74,785.39 -548.74,1302.77 0,522.46 186.6,955.88 558.93,1300.23 372.35,346.91 827.81,520.77 1365.55,520.77 325.69,0 614.06,-64.46 869.36,-195.93 253.59,-128.92 436.8,-297.71 548.75,-502.95l-161.14 -193.37zm9674.52 -10724.78c-52.86,-389.98 -279.55,-670.81 -555.83,-859.44 -513.41,-350.53 -727.19,-729.73 -819.67,-1308.26 -8.3,-51.94 -7.39,-59.89 -23.78,-111.69 -35.2,-111.32 -15.38,-56.19 -46.62,-104.35 -235.69,1634.91 1177.83,1446.2 1215.09,2636.35 13.53,432.59 -118.26,777.1 -251.44,1153.78 97.37,-67.99 10.82,2.64 80.62,-75.41 310.46,-347.16 321.98,-729.07 499.12,-1000.47 77.88,-119.33 146.33,-203.94 205,-359.46 435.99,-1155.21 219.34,-1720.84 -527.13,-2371.36 -483.84,-421.65 -760.23,-587.55 -1004.42,-1213.26 -100.94,-258.72 -138.97,-816.35 -201.46,-918.82 -111.95,452.14 -77.97,946.13 104.04,1342.87 445.83,971.89 1196.66,1016.78 1446.59,1781.17 106.76,326.47 88.26,744.46 21.58,1092.86 -26,135.82 -54.25,221.93 -141.69,315.49zm-4971.28 3065.35c-237.11,-278.41 -469.9,-698 -636.23,-1158.17 -125.15,-346.3 -330.54,-1031.2 -310.03,-1424.85 508.97,7.07 1489.73,507.36 1981.32,755.48 192.05,96.93 343.62,259.36 542.39,329.3 -209.23,-507.85 -2628.47,-1791.79 -3030.22,-1730.92 -86.33,471.62 72.21,1317.75 218.18,1745.07 248.39,727.05 809.16,1319.03 856.73,1477.49 -544.26,16.98 -1759.05,280.91 -2213.16,467.4 -127.14,52.23 -547.38,189.19 -621.89,253.86 94.92,434.61 1208.51,1178.22 1618.59,1465.89 832.07,583.73 2538.27,1445.25 4024.26,524.73 -286.92,42.08 -1479.47,409.71 -2899.77,-266.8 -389.94,-185.72 -1790.36,-1110.55 -1897.63,-1561.73 187.54,-61.25 405.21,-145.47 607.4,-211.28 2345.96,-763.52 1272.06,-144.96 2845.42,383.64 266.61,105.12 973.29,366.07 1233.53,216.72 -135.86,-62.76 -503.94,-98.23 -714.74,-177.53 -638.69,-240.28 -1157.41,-563.81 -1604.15,-1088.3zm6978.99 -1517.51c630.96,-311.85 1185.34,-625.31 1855.86,-928.48 189.81,-71.38 510.98,-222.99 702.96,-144.6 10.07,432.17 -205.85,1097.51 -341.03,1481.12 -385.92,1095.15 -1198.69,1841.59 -2281.2,2218.28 -147.5,51.33 -627.62,133.84 -684.9,166.22 248.29,158.96 1016.08,-133.98 1261.1,-224.25 369.25,-136.01 522.4,-254.74 800.61,-450.34 311.16,-218.78 339.58,-404.85 825.2,-278.93 867.84,225.02 1028.36,294.11 1853.25,551.45 -39,284.09 -388.38,520.8 -646.22,751.43 -2734.44,1787.71 -3816.49,916.09 -4203.11,1118.66 370.83,279.49 1244.48,345.27 1766.01,305.79 642.05,-48.6 1102.95,-219.47 1632.39,-457.22 668.62,-300.22 752.59,-485.12 1275.54,-811.67 182.84,-114.2 970.53,-849.75 1035.25,-1062.12 -1335.27,-721.84 -2725.23,-637.4 -2862.65,-731.35 1.36,-27.71 664.61,-1144.07 763.24,-1424.5 139.77,-397.43 408.13,-1406.8 315.39,-1843.38 -551.24,25.48 -2775.63,1216.4 -3067.69,1763.89zm-3010.39 1342.78c-31.86,-1057.1 233.22,-3057.63 -1150.82,-3283.81 -438.09,-71.61 -913.69,-10.63 -1158.05,-324.55 -158.86,-340.23 374.17,-391.03 160.25,-725.12 -71.93,-112.31 -75.09,-98.78 -138.25,-259.97l296.09 -213.46c-60,-133.32 -79.13,-110.58 -159.53,-203.57 45.15,-239.7 193.4,-252.37 165.31,-423.2 -29.88,-181.71 -160.63,-228.25 -191.29,-494.16 463.48,-139.07 678.38,-227.4 919.45,-520.29 124.76,-151.56 312.96,-1070.57 185.69,-1209.47 -165.34,309.56 -95.85,823.01 -344.44,1131.32 -246.93,306.24 -677.34,230.53 -1020.42,465.71 -44.31,276.48 18.09,311.35 146.94,455.28 229.43,256.27 57,282.16 0.6,457.89 -49.06,152.84 12.48,136.52 14.08,262.5 2.35,184.16 -26.16,84.41 -91.22,229.96 -77.62,173.62 63.15,280.94 138.38,447.24 -109.06,221.26 -516.88,527.85 118.47,915.42 300.09,183.06 835.46,135.2 1203.91,327 739.75,385.08 789.48,2432.73 666.96,3181.27 -84.42,515.65 -575.55,523.69 -675.49,1616.65 -42.78,468.05 110.57,897.38 333.72,1203.84 156.16,214.46 513.46,638.2 867.65,693.31 -78.75,-244.77 -915.1,-832.51 -772.47,-1800.34 145.65,-988.48 1757.05,-2404.4 2523.76,-3198.95 309.52,-367.54 578.95,-780.51 851.82,-1310.67 322.79,-627.13 350.77,-1470.61 184.69,-2194.93 -144.9,-631.89 -608.52,-1174.01 -1126,-1524.18 -234.72,-158.86 -558.88,-318.02 -815.31,-471.83 -644.56,-386.63 -1014.8,-647.38 -1381.9,-1283.14 -189.78,-328.65 -225.98,-627.04 -379.48,-934.38 -304.23,318.09 463.86,1644.13 862.94,1944.16 2747.13,2089.36 3226.02,4762.52 -236.04,7044.47zm7020.06 10756.95l77.33 0 79.23 -176.62 363.72 0 78.28 176.62 81.15 0 -304.54 -673.02 -70.63 0 -304.54 673.02zm186.16 -244.39l152.74 -340.81 151.79 340.81 -304.53 0zm-1178.99 244.39l535.55 0 0 -67.78 -433.4 0 433.4 -549.87 0 -50.6 -521.23 0 0 67.78 418.13 0 -432.45 549.87 0 50.6zm-967.05 0l487.82 0 0 -68.74 -412.4 0 0 -233.88 364.66 0 0 -68.74 -364.66 0 0 -228.16 407.62 0 0 -68.73 -483.04 0 0 668.25zm-945.09 0l451.54 0 0 -69.69 -376.13 0 0 -598.56 -75.41 0 0 668.25zm-997.6 0l487.81 0 0 -68.74 -412.39 0 0 -233.88 364.66 0 0 -68.74 -364.66 0 0 -228.16 407.62 0 0 -68.73 -483.04 0 0 668.25zm-1047.25 0l296.9 0c146.07,0 242.48,-67.78 242.48,-182.34l0 -1.9c0,-90.7 -63.97,-138.43 -143.19,-161.34 52.5,-22.91 105.96,-67.78 105.96,-154.66l0 -1.9c0,-41.05 -14.32,-77.33 -42.96,-106.93 -38.19,-37.22 -98.33,-59.18 -174.7,-59.18l-284.49 0 0 668.25zm425.78 -489.73c0,79.23 -62.05,119.33 -153.71,119.33l-197.6 0 0 -230.07 203.34 0c95.46,0 147.97,42.96 147.97,108.83l0 1.91zm37.23 302.62c0,75.41 -62.05,119.33 -164.2,119.33l-224.34 0 0 -235.79 210.97 0c117.42,0 177.57,42 177.57,114.55l0 1.91zm-2104.98 187.11l487.81 0 0 -68.74 -412.41 0 0 -233.88 364.68 0 0 -68.74 -364.68 0 0 -228.16 407.63 0 0 -68.73 -483.03 0 0 668.25zm-1104.53 0l231.98 0c210.02,0 355.13,-146.06 355.13,-334.13l0 -1.9c0,-188.07 -145.11,-332.22 -355.13,-332.22l-231.98 0 0 668.25zm231.98 -598.56c168.96,0 276.84,116.46 276.84,264.43l0 1.92c0,148.92 -107.88,262.52 -276.84,262.52l-156.56 0 0 -528.87 156.56 0zm-1735.54 610.01c203.34,0 341.76,-161.33 341.76,-345.58l0 -1.9c0,-184.25 -136.51,-343.67 -339.85,-343.67 -203.34,0 -341.76,161.32 -341.76,345.57l0 1.92c0,184.25 136.52,343.66 339.85,343.66zm1.91 -69.69c-152.74,0 -263.49,-124.1 -263.49,-275.89l0 -1.9c0,-151.79 108.84,-273.99 261.58,-273.99 152.75,0 263.48,124.1 263.48,275.89l0 1.92c0,151.79 -108.83,273.97 -261.57,273.97zm-941.27 58.24l75.42 0 0 -668.25 -75.42 0 0 668.25zm-1111.2 0l231.98 0c210.01,0 355.11,-146.06 355.11,-334.13l0 -1.9c0,-188.07 -145.1,-332.22 -355.11,-332.22l-231.98 0 0 668.25zm231.98 -598.56c168.96,0 276.84,116.46 276.84,264.43l0 1.92c0,148.92 -107.88,262.52 -276.84,262.52l-156.58 0 0 -528.87 156.58 0zm-1047.25 609.06c167.06,0 278.76,-100.23 278.76,-295.93l0 -382.82 -75.42 0 0 388.54c0,146.07 -78.29,220.52 -201.44,220.52 -128.87,0 -204.29,-80.19 -204.29,-225.29l0 -383.77 -75.42 0 0 388.54c0,189.02 112.65,290.21 277.81,290.21zm-1063.47 -10.5l75.41 0 0 -598.56 225.29 0 0 -69.69 -526 0 0 69.69 225.3 0 0 598.56zm-903.1 9.55c132.7,0 228.16,-74.47 228.16,-189.02l0 -1.92c0,-102.14 -68.74,-155.6 -217.66,-189.01 -147.96,-30.55 -181.38,-66.82 -181.38,-129.84l0 -1.9c0,-61.1 54.41,-107.88 142.25,-107.88 68.72,0 130.78,21.96 192.84,72.55l43.91 -58.23c-68.74,-54.41 -136.52,-82.1 -234.85,-82.1 -126.96,0 -219.57,78.28 -219.57,182.34l0 1.91c0,109.78 70.65,159.42 224.35,192.83 140.33,30.56 173.74,64.92 173.74,126.97l0 1.91c0,65.87 -58.23,113.6 -148.93,113.6 -92.59,0 -159.42,-30.54 -229.11,-94.51l-46.78 55.37c80.19,72.55 166.11,106.93 273.03,106.93zm9263.85 -3219.87l589.49 -1374.03 596.25 1374.03 -525.44 0 -251.74 274.8 898.47 0 370.64 860.03 877 0 -1558.07 -3562.28 -280.75 0 -1560.61 3562.28 355.38 0 361.65 -833.43 11.54 -26.6 116.19 -274.8zm5732.73 81.42c-94.99,-226.47 -270.57,-374.9 -529.25,-446.99 265.46,-72.1 476.66,-196.78 636.11,-375.73 156.07,-178.97 235.8,-387.61 235.8,-628.49 0,-308.74 -129.77,-562.34 -387.61,-760.8 -258.7,-197.62 -578.45,-296.86 -960.99,-296.86l-1536.87 0 0 3562.28 829.53 0 0 -1441.02 586.09 0c76.31,52.58 138.23,128.92 185.72,226.44l422.4 918.57c59.36,131.47 134,230.7 225.6,296.01l893.97 0c-106.88,-72.09 -201.01,-201.86 -285.83,-387.61l-314.67 -665.8zm-1199.3 -2234.07c210.34,0 377.44,72.11 503.81,216.3 126.36,144.17 188.28,335.02 188.28,571.65 0,238.32 -61.92,430.02 -188.28,571.66 -126.37,141.64 -293.47,213.73 -503.81,213.73l-513.98 0 0 -1573.34 513.98 0zm3173.81 1617.45l1358.76 0 0 -273.1 -1358.76 0 0 -1344.35 1766.72 0 0 -274.8 -2596.23 0 0 3562.28 2645.43 0 0 -274.8 -1815.92 0 0 -1395.23zm-16170.2 1714.98c449.54,0 803.23,-122.14 1059.37,-365.55 255.29,-242.57 381.67,-569.98 381.67,-984.72l0 -2256.96 -295.17 0 0 2229.82c0,302.79 -83.96,543.67 -256.15,719.23 -171.32,178.97 -405.42,268.02 -701.41,268.02 -305.35,0 -547.07,-89.05 -726.04,-268.02 -181.5,-178.09 -270.55,-418.97 -270.55,-719.23l0 -2229.82 -829.52 0 0 2150.95c0,433.4 154.39,783.7 462.25,1050.86 307.04,271.42 700.59,405.42 1175.55,405.42zm3116.16 -44.95l0 -3562.28 -829.51 0 0 3562.28 829.51 0zm920.24 -3562.28l0 3562.28 1459.7 0c556.4,0 1023.72,-170.49 1398.62,-510.6 374.88,-340.95 561.47,-765.88 561.47,-1270.53 0,-504.66 -186.59,-929.59 -561.47,-1270.55 -374.9,-340.11 -842.22,-510.6 -1398.62,-510.6l-1459.7 0zm829.51 3287.48l0 -3012.68 543.67 0c360.47,0 648,136.57 869.37,412.22 218.82,276.5 327.4,639.51 327.4,1094.13 0,454.6 -108.58,820.16 -327.4,1094.12 -221.37,275.64 -508.9,412.21 -869.37,412.21l-543.67 0z"/>
  </svg>
);

export default function LandingPage({ onOpenBooking, onNavigateToAdmin, professionals: propProfessionals }: LandingPageProps) {
  const activeProfessionals = propProfessionals && propProfessionals.length > 0 ? propProfessionals : defaultProfessionals;
  const [activeCategory, setActiveCategory] = useState<string>('escovas');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const heroImageRef = useRef<HTMLDivElement>(null);
  const conceptRef = useRef<HTMLDivElement>(null);

  const filteredServices = services.filter(s => s.category === activeCategory);

  const getServiceFormattedPrice = (service: Service) => {
    if (service.category === 'cursos' && service.priceBase === 0) {
      return 'Sob consulta';
    }
    if (service.priceType === 'range' && service.priceRange) {
      return `R$ ${service.priceRange.min},00 a R$ ${service.priceRange.max},00`;
    }
    if (service.variablePrice) {
      if (service.priceRange) {
        return `R$ ${service.priceRange.min},00 a R$ ${service.priceRange.max},00`;
      }
      if (service.priceDetails) {
        return `A partir de R$ ${service.priceDetails.P},00`;
      }
      return `A partir de R$ ${service.priceBase},00`;
    }
    return `R$ ${service.priceBase},00`;
  };

  // Scroll effect for Navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // GSAP Animations with container scope & reduced-motion check
  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const tl = gsap.timeline();
    
    // Hero Animations
    if (heroImageRef.current) {
      tl.fromTo(heroImageRef.current, { scale: 1.04, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.2, ease: 'power2.out' })
        .fromTo('.hero-eyebrow', { y: 15, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'power2.out' }, '-=0.8')
        .fromTo('.hero-h1', { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'power2.out' }, '-=0.5')
        .fromTo('.hero-p', { y: 15, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'power2.out' }, '-=0.5')
        .fromTo('.hero-cta', { y: 15, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'power2.out', stagger: 0.1 }, '-=0.5')
        .fromTo('.hero-prof', { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'power2.out' }, '-=0.7');
    }

    // Concept Section reveal (safely checks selector presence inside container)
    const revealElements = containerRef.current?.querySelectorAll('.concept-reveal');
    if (conceptRef.current && revealElements && revealElements.length > 0) {
      gsap.fromTo(
        revealElements,
        { y: 25, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: conceptRef.current,
            start: 'top 80%',
          }
        }
      );
    }
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="min-h-screen bg-[#FAF8F5] relative selection:bg-[#C7A15D] selection:text-white">
      
      {/* HEADER / NAVBAR */}
      <header 
        className={`fixed top-0 w-full z-40 transition-all duration-300 ${
          scrolled 
            ? 'bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E6DFD5] h-[72px] shadow-xs' 
            : 'bg-transparent border-b border-transparent h-[80px]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex justify-between items-center">
          <a href="#" className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-[#C7A15D] rounded-lg p-1">
            <Logo className="h-9 w-auto text-[#29231F]" />
            <span className="font-serif tracking-widest font-bold text-lg hidden sm:block text-[#29231F]">CUIDARE</span>
          </a>

          {/* Desktop Nav - Balanced padding for 768px+ */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-8" aria-label="Navegação principal">
            <a href="#sobre" className="text-xs lg:text-sm font-medium text-[#5C534D] hover:text-[#29231F] transition-colors">O Espaço</a>
            <a href="#servicos" className="text-xs lg:text-sm font-medium text-[#5C534D] hover:text-[#29231F] transition-colors">Serviços</a>
            <a href="#profissionais" className="text-xs lg:text-sm font-medium text-[#5C534D] hover:text-[#29231F] transition-colors">Equipe</a>
            <a href="#horarios" className="text-xs lg:text-sm font-medium text-[#5C534D] hover:text-[#29231F] transition-colors">Horários & Local</a>
            <button 
              onClick={() => onOpenBooking()}
              className="px-5 lg:px-6 h-10 bg-[#29231F] text-white text-xs lg:text-sm font-semibold rounded-lg hover:bg-[#3D342E] transition-all duration-200 active:scale-95 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C7A15D]"
            >
              Agendar horário
            </button>
          </nav>

          {/* Mobile Menu Toggle - Touch target >= 44x44px with accessible name & state */}
          <div className="md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="w-11 h-11 flex items-center justify-center text-[#29231F] hover:bg-black/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C7A15D]"
              aria-label={mobileMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              id="mobile-navigation-drawer"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-[#FAF8F5] border-b border-[#E6DFD5] px-6 py-6 shadow-xl"
            >
              <nav className="flex flex-col gap-4 text-center">
                <a 
                  href="#sobre" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 text-base font-serif text-[#29231F] hover:text-[#70542D]"
                >
                  O Espaço
                </a>
                <a 
                  href="#servicos" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 text-base font-serif text-[#29231F] hover:text-[#70542D]"
                >
                  Serviços
                </a>
                <a 
                  href="#profissionais" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 text-base font-serif text-[#29231F] hover:text-[#70542D]"
                >
                  Profissionais
                </a>
                <a 
                  href="#horarios" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 text-base font-serif text-[#29231F] hover:text-[#70542D]"
                >
                  Horários & Local
                </a>
                <button 
                  onClick={() => { setMobileMenuOpen(false); onOpenBooking(); }}
                  className="w-full min-h-[44px] bg-[#29231F] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#3D342E] transition-colors mt-2"
                >
                  Agendar horário online
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO SECTION */}
      <section 
        id="hero"
        ref={heroRef}
        className="relative min-h-[92vh] lg:min-h-screen pt-24 lg:pt-28 pb-12 overflow-hidden flex items-center bg-[#FAF8F5]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Hero Copy (5-6 cols) */}
          <div ref={heroContentRef} className="lg:col-span-6 xl:col-span-5 space-y-6 z-10">
            <span className="hero-eyebrow text-xs uppercase tracking-widest text-[#70542D] font-bold block">
              Espaço de Beleza e Bem-Estar em Taiobeiras
            </span>
            <h1 className="hero-h1 text-[38px] sm:text-[48px] lg:text-[56px] font-serif text-[#29231F] leading-[1.15] font-normal tracking-tight">
              O cuidado que você merece, em cada detalhe.
            </h1>
            <p className="hero-p text-[#5C534D] text-base sm:text-lg leading-relaxed font-light max-w-xl">
              Agende online de forma rápida e segura com nossas especialistas. Escolha seu procedimento e desfrute de uma experiência acolhedora, sofisticada e feita sob medida para você.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button 
                onClick={() => onOpenBooking()} 
                className="hero-cta min-h-[48px] px-7 bg-[#29231F] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-[#3D342E] transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#C7A15D]"
              >
                Agendar meu horário <ArrowRight size={16} />
              </button>
              <a 
                href="#servicos" 
                className="hero-cta min-h-[48px] px-6 border border-[#DDD6CC] text-[#29231F] text-sm font-semibold rounded-xl flex items-center justify-center hover:bg-black/5 transition-colors"
              >
                Conhecer serviços
              </a>
            </div>
          </div>

          {/* Hero Image with WebP and srcset */}
          <div ref={heroImageRef} className="lg:col-span-6 xl:col-span-7 flex items-end justify-center lg:justify-end mt-4 lg:mt-0 relative w-full z-0">
            <div className="relative h-[420px] sm:h-[520px] lg:h-[620px] w-full flex items-end justify-center lg:justify-end hero-prof">
              <img 
                src="/team/hero.webp"
                srcSet="/team/hero-800.webp 800w, /team/hero.webp 1242w"
                sizes="(max-width: 768px) 100vw, 650px"
                width={1242}
                height={1055}
                loading="eager"
                decoding="async"
                alt="Equipe de especialistas Cuidare Espaço de Beleza" 
                className="h-full w-auto max-w-full object-contain object-bottom origin-bottom-right" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* CONCEPT SECTION */}
      <section id="sobre" ref={conceptRef} className="py-20 lg:py-24 bg-[#F5EFE6] border-t border-[#E6DFD5] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            
            {/* Copy */}
            <div className="lg:w-[48%] concept-reveal space-y-6">
              <span className="text-xs uppercase tracking-widest text-[#70542D] font-bold block">
                Estrutura & Conceito
              </span>
              <h2 className="text-[32px] sm:text-[42px] lg:text-[48px] font-serif text-[#29231F] leading-tight font-normal">
                Um conceito completo de cuidado para você.
              </h2>
              <p className="text-[#5C534D] text-base leading-relaxed font-light">
                O Cuidare Studio foi planejado para reunir excelência estética e bem-estar em um único endereço. Uma infraestrutura moderna e acolhedora unida a uma equipe altamente capacitada para proporcionar conforto absoluto.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-8 pt-4">
                <div className="flex items-start gap-4">
                  <span className="text-5xl font-serif text-[#C7A15D] leading-none">04</span>
                  <span className="text-sm font-semibold text-[#5C534D] uppercase tracking-wider leading-snug pt-1">
                    Andares dedicados<br/>ao cuidado
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-[#5B7C65] shrink-0" size={28} />
                  <span className="text-sm font-medium text-[#5C534D]">
                    Ambiente planejado com<br/>rigorosa biossegurança
                  </span>
                </div>
              </div>
            </div>

            {/* Atmosphere Image */}
            <div className="lg:w-[52%] w-full concept-reveal">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#E6DFD5] shadow-md bg-[#FAF8F5]">
                <img 
                  src="/background-hero.webp" 
                  alt="Ambiente do Espaço Cuidare em Taiobeiras" 
                  width={1000}
                  height={750}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section id="servicos" className="py-20 lg:py-24 bg-[#FAF8F5] border-t border-[#E6DFD5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="mb-10 max-w-2xl">
            <span className="text-xs uppercase tracking-widest text-[#70542D] font-bold block mb-1">Catálogo Exclusivo</span>
            <h2 className="text-[32px] sm:text-[44px] font-serif text-[#29231F] font-normal">Nossos Serviços</h2>
            <p className="text-[#5C534D] text-base font-light mt-2">
              Selecione uma categoria abaixo para conhecer nossos procedimentos e valores.
            </p>
          </div>

          {/* Category Tabs Carousel */}
          <div className="relative mb-8">
            <div 
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scroll-smooth"
              role="tablist"
              aria-label="Categorias de serviços Cuidare"
            >
              {CATEGORIES.map(category => {
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveCategory(category.id)}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#C7A15D] ${
                      isActive 
                        ? 'bg-[#29231F] text-white shadow-sm' 
                        : 'bg-[#F2ECE4] text-[#5C534D] hover:bg-[#E6DFD5]'
                    }`}
                  >
                    <category.icon size={15} className={isActive ? 'text-[#C7A15D]' : 'opacity-70'} />
                    <span>{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtered Services List */}
          <div className="grid gap-3 sm:gap-4">
            <AnimatePresence mode="popLayout">
              {filteredServices.map((service) => {
                const isCourse = service.category === 'cursos';

                return (
                  <motion.div
                    key={service.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="p-5 sm:p-6 bg-[#FFFDFB] border border-[#E6DFD5] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#C7A15D]/60 transition-colors shadow-xs"
                  >
                    <div className="space-y-1 md:w-3/5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif text-lg font-bold text-[#29231F]">{service.name}</h3>
                        {service.flowBadge && (
                          <span className="text-[10px] bg-[#FAF3E8] text-[#70542D] px-2 py-0.5 rounded font-semibold border border-[#E6DFD5]">
                            {service.flowBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-[#5C534D] font-light leading-relaxed">{service.description}</p>
                      {service.note && (
                        <p className="text-xs text-[#70542D] italic flex items-center gap-1 pt-0.5">
                          <Sparkles size={12} className="text-[#C7A15D]" /> {service.note}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 md:w-2/5 pt-3 md:pt-0 border-t md:border-t-0 border-[#E6DFD5]">
                      <div className="flex flex-col text-left md:text-right">
                        <span className="text-[10px] uppercase font-bold text-[#7C736D] tracking-wider">Duração</span>
                        <span className="text-xs sm:text-sm text-[#5C534D] font-medium">{service.duration} min</span>
                      </div>

                      <div className="flex flex-col text-right min-w-[90px]">
                        <span className="text-[10px] uppercase font-bold text-[#7C736D] tracking-wider">Valor</span>
                        <span className="text-sm sm:text-base font-serif font-bold text-[#29231F]">
                          {getServiceFormattedPrice(service)}
                        </span>
                      </div>

                      {isCourse ? (
                        <a
                          href={`https://wa.me/5538992380097?text=${encodeURIComponent("Olá, Maísa! Vi o Curso de Penteado e Maquiagem para Iniciantes no site da Cuidare e gostaria de consultar informações, turmas e inscrições.")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] px-5 bg-[#C7A15D] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#B38D4A] transition-colors rounded-xl flex items-center justify-center shrink-0"
                        >
                          Consultar Turmas
                        </a>
                      ) : (
                        <button
                          onClick={() => onOpenBooking({ service })}
                          className="min-h-[44px] px-5 bg-[#29231F] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#3D342E] transition-colors rounded-xl flex items-center justify-center shrink-0 focus:outline-none focus:ring-2 focus:ring-[#C7A15D]"
                        >
                          Agendar
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          
          <p className="text-xs text-[#7C736D] mt-8 uppercase tracking-widest text-center">
            * Valores e durações estimadas de referência, sujeitos à avaliação capilar.
          </p>
        </div>
      </section>

      {/* PROFESSIONALS SECTION */}
      <section id="profissionais" className="py-20 lg:py-24 bg-[#F5EFE6] border-t border-[#E6DFD5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="mb-12 max-w-2xl">
            <span className="text-xs uppercase tracking-widest text-[#70542D] font-bold block mb-1">Corpo Profissional</span>
            <h2 className="text-[32px] sm:text-[44px] font-serif text-[#29231F] font-normal">Nossa Equipe</h2>
            <p className="text-[#5C534D] text-base font-light mt-2">
              Especialistas dedicadas com atendimento humanizado e técnicas avançadas.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {activeProfessionals.map((prof) => {
              const initials = prof.name.split(' ').map(n => n[0]).join('').slice(0, 2);
              const firstName = prof.name.split(' ')[0];

              return (
                <div key={prof.id} className="flex flex-col bg-[#FFFDFB] rounded-2xl border border-[#E6DFD5] overflow-hidden shadow-xs hover:shadow-md transition-shadow">
                  {/* Portrait photo */}
                  <div className="aspect-[4/5] bg-[#FAF8F5] relative overflow-hidden group">
                    {prof.photoUrl ? (
                      <img 
                        src={prof.photoUrl} 
                        alt={`Foto de ${prof.name}`} 
                        width={600}
                        height={750}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-103" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#FAF3E8]">
                        <span className="text-6xl font-serif text-[#C7A15D]">{initials}</span>
                      </div>
                    )}

                    {/* Specialty Highlight Badge */}
                    {(prof.specialtyHighlight || prof.specialtyBadge) && (
                      <div className="absolute top-3 left-3 z-10">
                        <span className="px-3 py-1 bg-[#FAF8F5]/95 backdrop-blur-sm text-[#70542D] text-[10px] font-bold tracking-wider rounded-md border border-[#E6DFD5] flex items-center gap-1 uppercase shadow-xs">
                          <Sparkles size={11} className="text-[#C7A15D]" /> {prof.specialtyHighlight || prof.specialtyBadge}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info & Booking Action */}
                  <div className="p-5 flex flex-col grow justify-between space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-xl font-serif font-bold text-[#29231F]">{prof.name}</h3>
                      <span className="text-xs uppercase font-semibold text-[#70542D] tracking-wider block">{prof.role}</span>
                      <p className="text-xs text-[#5C534D] font-light leading-relaxed pt-1">{prof.bio}</p>
                      
                      <div className="flex flex-wrap gap-1.5 pt-3">
                        {prof.specialties.slice(0, 3).map((spec, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-[#FAF3E8] text-[#70542D] rounded font-semibold border border-[#E6DFD5]">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E6DFD5]">
                      {prof.id === 'lara' ? (
                        <a
                          href={`https://wa.me/${prof.whatsapp?.replace(/\D/g, '') || '5538991007706'}?text=${encodeURIComponent("Olá, Lara! Gostaria de informações sobre horários e agendamentos no Espaço Cuidare.")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#29231F] hover:text-[#70542D] transition-colors"
                        >
                          <span>Falar com Lara (Recepção)</span>
                          <ArrowRight size={15} />
                        </a>
                      ) : (
                        <button
                          onClick={() => onOpenBooking({ professional: prof })}
                          aria-label={`Agendar horário com ${prof.name}`}
                          className="min-h-[44px] w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#29231F] hover:text-[#70542D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C7A15D] rounded-lg p-1"
                        >
                          <span>Agendar com {firstName}</span>
                          <ArrowRight size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* LOCATION & HOURS */}
      <section id="horarios" className="py-20 lg:py-24 bg-[#FAF8F5] border-t border-[#E6DFD5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">
            
            {/* Map Atmosphere Image */}
            <div className="lg:w-[50%] w-full">
              <div className="aspect-[4/3] bg-[#F5EFE6] rounded-2xl overflow-hidden border border-[#E6DFD5] shadow-sm">
                <img 
                  src="/background-hero.webp" 
                  alt="Ambiente de atendimento no Cuidare Espaço de Beleza" 
                  width={800}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover" 
                />
              </div>
            </div>

            {/* Info */}
            <div className="lg:w-[50%] space-y-8">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#70542D] font-bold block mb-1">Localização</span>
                <h2 className="text-[32px] sm:text-[40px] font-serif text-[#29231F] leading-tight font-normal">
                  Onde cuidar de você.
                </h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#70542D] mb-2 flex items-center gap-1.5">
                    <MapPin size={16} /> Endereço do Espaço
                  </h3>
                  <p className="text-[#29231F] text-base font-semibold">Rua Paracatu, 15, Centro</p>
                  <p className="text-[#5C534D] text-sm">Taiobeiras - MG, CEP 39580-000</p>
                  
                  {/* Google Maps link */}
                  <a 
                    href="https://maps.google.com/?q=Rua+Paracatu,+15,+Centro,+Taiobeiras+-+MG"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-[#70542D] hover:text-[#29231F] mt-2 underline"
                  >
                    Como chegar pelo Google Maps <ArrowRight size={13} />
                  </a>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#70542D] mb-3 flex items-center gap-1.5">
                    <Clock size={16} /> Horário de Funcionamento
                  </h3>
                  <ul className="space-y-2.5 text-sm text-[#29231F]">
                    <li className="flex justify-between border-b border-[#E6DFD5] pb-2">
                      <span className="text-[#5C534D]">Terça a Sexta</span>
                      <span className="font-semibold text-right">08:00 às 11:30 • 14:00 às 18:00</span>
                    </li>
                    <li className="flex justify-between border-b border-[#E6DFD5] pb-2">
                      <span className="text-[#5C534D]">Sábado</span>
                      <span className="font-semibold">08:00 às 18:00 (direto)</span>
                    </li>
                    <li className="flex justify-between pb-1">
                      <span className="text-[#5C534D]">Domingo e Segunda</span>
                      <span className="text-[#7C736D] uppercase text-xs font-semibold">Fechado*</span>
                    </li>
                  </ul>
                  <p className="text-[11px] text-[#7C736D] mt-2 italic">
                    * Atendimento de Noivas, Debutantes e produções de eventos sob agendamento prévio.
                  </p>
                </div>

                {/* Social contacts */}
                <div className="flex gap-3 pt-2">
                  {getBusinessSettings().instagramUrl && (
                    <a 
                      href={getBusinessSettings().instagramUrl}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-4 rounded-xl border border-[#DDD6CC] text-[#29231F] hover:bg-[#29231F] hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold"
                      aria-label="Seguir o Espaço Cuidare no Instagram"
                    >
                      <Instagram size={16} /> Instagram
                    </a>
                  )}
                  {getBusinessSettings().businessWhatsapp && (
                    <a 
                      href={`https://wa.me/${getBusinessSettings().businessWhatsapp?.replace(/\D/g, '')}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-4 rounded-xl border border-[#DDD6CC] text-[#29231F] hover:bg-[#29231F] hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold"
                      aria-label="Falar com a recepção do Espaço Cuidare no WhatsApp"
                    >
                      <Phone size={16} /> WhatsApp da Recepção
                    </a>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[#29231F] py-20 lg:py-28 relative overflow-hidden flex flex-col items-center justify-center text-center">
        <div className="max-w-3xl mx-auto px-4 z-10 space-y-6">
          <div className="w-12 h-px bg-[#C7A15D] mx-auto" />
          <h2 className="text-[34px] sm:text-[48px] font-serif text-white font-normal leading-tight">
            Seu momento de <span className="text-[#C7A15D] italic">cuidado</span> começa aqui.
          </h2>
          <p className="text-[#C8C2BE] text-base leading-relaxed max-w-xl mx-auto font-light">
            Escolha o serviço, selecione a data no calendário e agende seu horário com total comodidade.
          </p>
          <button
            onClick={() => onOpenBooking()}
            className="min-h-[48px] px-8 bg-white text-[#29231F] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#C7A15D] hover:text-white transition-all shadow-sm active:scale-95"
          >
            Agendar meu horário online
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1F1A17] pt-14 pb-8 border-t border-white/10 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-3">
              <Logo className="h-8 w-auto text-white" />
              <span className="font-serif tracking-widest font-bold text-sm">CUIDARE</span>
            </div>
            <nav className="flex flex-wrap gap-6 text-xs text-[#A69E9A]" aria-label="Links do rodapé">
              <a href="#sobre" className="hover:text-white transition-colors">O Espaço</a>
              <a href="#servicos" className="hover:text-white transition-colors">Serviços</a>
              <a href="#profissionais" className="hover:text-white transition-colors">Equipe</a>
              <a href="#horarios" className="hover:text-white transition-colors">Horários & Local</a>
              <button 
                type="button"
                onClick={() => setPrivacyOpen(true)}
                className="hover:text-white transition-colors underline"
              >
                Privacidade & Cancelamento
              </button>
            </nav>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-white/10 text-[11px] text-[#8C837C]">
            <span>© 2026 Cuidare Espaço de Beleza & Saúde. Taiobeiras - MG.</span>
            <button 
              onClick={onNavigateToAdmin}
              className="hover:text-white transition-colors underline underline-offset-4"
            >
              Acesso Restrito
            </button>
          </div>
        </div>
      </footer>

      <PrivacyPolicyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}

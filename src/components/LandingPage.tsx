import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Scissors, Sparkles, Heart, Clock, MapPin, Instagram, Phone, 
  Star, ShieldCheck, Menu, X, ArrowRight
} from 'lucide-react';
import { services } from '../data/servicesData';
import { professionals } from '../data/professionalsData';
import type { Service } from '../types';

interface LandingPageProps {
  onOpenBooking: (service?: Service) => void;
  onNavigateToAdmin: () => void;
}

export default function LandingPage({ onOpenBooking, onNavigateToAdmin }: LandingPageProps) {
  const [activeCategory, setActiveCategory] = useState<string>('escovas');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Embed Cuidare SVG Logo
  const Logo = ({ className = "h-12 w-auto" }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29700 21000" fill="currentColor">
      <path className="fill-white" d="M6217.41 17444.27c-189.15,329.07 -548.76,532.63 -1003.39,532.63 -410.49,0 -736.19,-131.46 -972.84,-391.85 -236.63,-259.54 -355.36,-616.61 -355.36,-1074.61 0,-455.47 118.73,-815.09 355.36,-1074.62 236.65,-260.39 560.04,-405.86 967.76,-391.86 568.85,19.53 1139.94,837.17 1139.94,589.47l0 -14.42c0,-247.66 -134.02,-465.64 -399.5,-653.92 -268.01,-186.6 -603.89,-280.75 -1004.23,-280.75 -539.41,0 -994.87,176.42 -1360.45,528.41 -364.69,351.99 -548.74,785.39 -548.74,1302.77 0,522.46 186.6,955.88 558.93,1300.23 372.35,346.91 827.81,520.77 1365.55,520.77 325.69,0 614.06,-64.46 869.36,-195.93 253.59,-128.92 436.8,-297.71 548.75,-502.95l-161.14 -193.37zm9674.52 -10724.78c-52.86,-389.98 -279.55,-670.81 -555.83,-859.44 -513.41,-350.53 -727.19,-729.73 -819.67,-1308.26 -8.3,-51.94 -7.39,-59.89 -23.78,-111.69 -35.2,-111.32 -15.38,-56.19 -46.62,-104.35 -235.69,1634.91 1177.83,1446.2 1215.09,2636.35 13.53,432.59 -118.26,777.1 -251.44,1153.78 97.37,-67.99 10.82,2.64 80.62,-75.41 310.46,-347.16 321.98,-729.07 499.12,-1000.47 77.88,-119.33 146.33,-203.94 205,-359.46 435.99,-1155.21 219.34,-1720.84 -527.13,-2371.36 -483.84,-421.65 -760.23,-587.55 -1004.42,-1213.26 -100.94,-258.72 -138.97,-816.35 -201.46,-918.82 -111.95,452.14 -77.97,946.13 104.04,1342.87 445.83,971.89 1196.66,1016.78 1446.59,1781.17 106.76,326.47 88.26,744.46 21.58,1092.86 -26,135.82 -54.25,221.93 -141.69,315.49zm-4971.28 3065.35c-237.11,-278.41 -469.9,-698 -636.23,-1158.17 -125.15,-346.3 -330.54,-1031.2 -310.03,-1424.85 508.97,7.07 1489.73,507.36 1981.32,755.48 192.05,96.93 343.62,259.36 542.39,329.3 -209.23,-507.85 -2628.47,-1791.79 -3030.22,-1730.92 -86.33,471.62 72.21,1317.75 218.18,1745.07 248.39,727.05 809.16,1319.03 856.73,1477.49 -544.26,16.98 -1759.05,280.91 -2213.16,467.4 -127.14,52.23 -547.38,189.19 -621.89,253.86 94.92,434.61 1208.51,1178.22 1618.59,1465.89 832.07,583.73 2538.27,1445.25 4024.26,524.73 -286.92,42.08 -1479.47,409.71 -2899.77,-266.8 -389.94,-185.72 -1790.36,-1110.55 -1897.63,-1561.73 187.54,-61.25 405.21,-145.47 607.4,-211.28 2345.96,-763.52 1272.06,-144.96 2845.42,383.64 266.61,105.12 973.29,366.07 1233.53,216.72 -135.86,-62.76 -503.94,-98.23 -714.74,-177.53 -638.69,-240.28 -1157.41,-563.81 -1604.15,-1088.3zm6978.99 -1517.51c630.96,-311.85 1185.34,-625.31 1855.86,-928.48 189.81,-71.38 510.98,-222.99 702.96,-144.6 10.07,432.17 -205.85,1097.51 -341.03,1481.12 -385.92,1095.15 -1198.69,1841.59 -2281.2,2218.28 -147.5,51.33 -627.62,133.84 -684.9,166.22 248.29,158.96 1016.08,-133.98 1261.1,-224.25 369.25,-136.01 522.4,-254.74 800.61,-450.34 311.16,-218.78 339.58,-404.85 825.2,-278.93 867.84,225.02 1028.36,294.11 1853.25,551.45 -39,284.09 -388.38,520.8 -646.22,751.43 -2734.44,1787.71 -3816.49,916.09 -4203.11,1118.66 370.83,279.49 1244.48,345.27 1766.01,305.79 642.05,-48.6 1102.95,-219.47 1632.39,-457.22 668.62,-300.22 752.59,-485.12 1275.54,-811.67 182.84,-114.2 970.53,-849.75 1035.25,-1062.12 -1335.27,-721.84 -2725.23,-637.4 -2862.65,-731.35 1.36,-27.71 664.61,-1144.07 763.24,-1424.5 139.77,-397.43 408.13,-1406.8 315.39,-1843.38 -551.24,25.48 -2775.63,1216.4 -3067.69,1763.89zm-3010.39 1342.78c-31.86,-1057.1 233.22,-3057.63 -1150.82,-3283.81 -438.09,-71.61 -913.69,-10.63 -1158.05,-324.55 -158.86,-340.23 374.17,-391.03 160.25,-725.12 -71.93,-112.31 -75.09,-98.78 -138.25,-259.97l296.09 -213.46c-60,-133.32 -79.13,-110.58 -159.53,-203.57 45.15,-239.7 193.4,-252.37 165.31,-423.2 -29.88,-181.71 -160.63,-228.25 -191.29,-494.16 463.48,-139.07 678.38,-227.4 919.45,-520.29 124.76,-151.56 312.96,-1070.57 185.69,-1209.47 -165.34,309.56 -95.85,823.01 -344.44,1131.32 -246.93,306.24 -677.34,230.53 -1020.42,465.71 -44.31,276.48 18.09,311.35 146.94,455.28 229.43,256.27 57,282.16 0.6,457.89 -49.06,152.84 12.48,136.52 14.08,262.5 2.35,184.16 -26.16,84.41 -91.22,229.96 -77.62,173.62 63.15,280.94 138.38,447.24 -109.06,221.26 -516.88,527.85 118.47,915.42 300.09,183.06 835.46,135.2 1203.91,327 739.75,385.08 789.48,2432.73 666.96,3181.27 -84.42,515.65 -575.55,523.69 -675.49,1616.65 -42.78,468.05 110.57,897.38 333.72,1203.84 156.16,214.46 513.46,638.2 867.65,693.31 -78.75,-244.77 -915.1,-832.51 -772.47,-1800.34 145.65,-988.48 1757.05,-2404.4 2523.76,-3198.95 309.52,-367.54 578.95,-780.51 851.82,-1310.67 322.79,-627.13 350.77,-1470.61 184.69,-2194.93 -144.9,-631.89 -608.52,-1174.01 -1126,-1524.18 -234.72,-158.86 -558.88,-318.02 -815.31,-471.83 -644.56,-386.63 -1014.8,-647.38 -1381.9,-1283.14 -189.78,-328.65 -225.98,-627.04 -379.48,-934.38 -304.23,318.09 463.86,1644.13 862.94,1944.16 2747.13,2089.36 3226.02,4762.52 -236.04,7044.47zm7020.06 10756.95l77.33 0 79.23 -176.62 363.72 0 78.28 176.62 81.15 0 -304.54 -673.02 -70.63 0 -304.54 673.02zm186.16 -244.39l152.74 -340.81 151.79 340.81 -304.53 0zm-1178.99 244.39l535.55 0 0 -67.78 -433.4 0 433.4 -549.87 0 -50.6 -521.23 0 0 67.78 418.13 0 -432.45 549.87 0 50.6zm-967.05 0l487.82 0 0 -68.74 -412.4 0 0 -233.88 364.66 0 0 -68.74 -364.66 0 0 -228.16 407.62 0 0 -68.73 -483.04 0 0 668.25zm-945.09 0l451.54 0 0 -69.69 -376.13 0 0 -598.56 -75.41 0 0 668.25zm-997.6 0l487.81 0 0 -68.74 -412.39 0 0 -233.88 364.66 0 0 -68.74 -364.66 0 0 -228.16 407.62 0 0 -68.73 -483.04 0 0 668.25zm-1047.25 0l296.9 0c146.07,0 242.48,-67.78 242.48,-182.34l0 -1.9c0,-90.7 -63.97,-138.43 -143.19,-161.34 52.5,-22.91 105.96,-67.78 105.96,-154.66l0 -1.9c0,-41.05 -14.32,-77.33 -42.96,-106.93 -38.19,-37.22 -98.33,-59.18 -174.7,-59.18l-284.49 0 0 668.25zm425.78 -489.73c0,79.23 -62.05,119.33 -153.71,119.33l-197.6 0 0 -230.07 203.34 0c95.46,0 147.97,42.96 147.97,108.83l0 1.91zm37.23 302.62c0,75.41 -62.05,119.33 -164.2,119.33l-224.34 0 0 -235.79 210.97 0c117.42,0 177.57,42 177.57,114.55l0 1.91zm-2104.98 187.11l487.81 0 0 -68.74 -412.41 0 0 -233.88 364.68 0 0 -68.74 -364.68 0 0 -228.16 407.63 0 0 -68.73 -483.03 0 0 668.25zm-1104.53 0l231.98 0c210.02,0 355.13,-146.06 355.13,-334.13l0 -1.9c0,-188.07 -145.11,-332.22 -355.13,-332.22l-231.98 0 0 668.25zm231.98 -598.56c168.96,0 276.84,116.46 276.84,264.43l0 1.92c0,148.92 -107.88,262.52 -276.84,262.52l-156.56 0 0 -528.87 156.56 0zm-1735.54 610.01c203.34,0 341.76,-161.33 341.76,-345.58l0 -1.9c0,-184.25 -136.51,-343.67 -339.85,-343.67 -203.34,0 -341.76,161.32 -341.76,345.57l0 1.92c0,184.25 136.52,343.66 339.85,343.66zm1.91 -69.69c-152.74,0 -263.49,-124.1 -263.49,-275.89l0 -1.9c0,-151.79 108.84,-273.99 261.58,-273.99 152.75,0 263.48,124.1 263.48,275.89l0 1.92c0,151.79 -108.83,273.97 -261.57,273.97zm-941.27 58.24l75.42 0 0 -668.25 -75.42 0 0 668.25zm-1111.2 0l231.98 0c210.01,0 355.11,-146.06 355.11,-334.13l0 -1.9c0,-188.07 -145.1,-332.22 -355.11,-332.22l-231.98 0 0 668.25zm231.98 -598.56c168.96,0 276.84,116.46 276.84,264.43l0 1.92c0,148.92 -107.88,262.52 -276.84,262.52l-156.58 0 0 -528.87 156.58 0zm-1047.25 609.06c167.06,0 278.76,-100.23 278.76,-295.93l0 -382.82 -75.42 0 0 388.54c0,146.07 -78.29,220.52 -201.44,220.52 -128.87,0 -204.29,-80.19 -204.29,-225.29l0 -383.77 -75.42 0 0 388.54c0,189.02 112.65,290.21 277.81,290.21zm-1063.47 -10.5l75.41 0 0 -598.56 225.29 0 0 -69.69 -526 0 0 69.69 225.3 0 0 598.56zm-903.1 9.55c132.7,0 228.16,-74.47 228.16,-189.02l0 -1.92c0,-102.14 -68.74,-155.6 -217.66,-189.01 -147.96,-30.55 -181.38,-66.82 -181.38,-129.84l0 -1.9c0,-61.1 54.41,-107.88 142.25,-107.88 68.72,0 130.78,21.96 192.84,72.55l43.91 -58.23c-68.74,-54.41 -136.52,-82.1 -234.85,-82.1 -126.96,0 -219.57,78.28 -219.57,182.34l0 1.91c0,109.78 70.65,159.42 224.35,192.83 140.33,30.56 173.74,64.92 173.74,126.97l0 1.91c0,65.87 -58.23,113.6 -148.93,113.6 -92.59,0 -159.42,-30.54 -229.11,-94.51l-46.78 55.37c80.19,72.55 166.11,106.93 273.03,106.93zm9263.85 -3219.87l589.49 -1374.03 596.25 1374.03 -525.44 0 -251.74 274.8 898.47 0 370.64 860.03 877 0 -1558.07 -3562.28 -280.75 0 -1560.61 3562.28 355.38 0 361.65 -833.43 11.54 -26.6 116.19 -274.8zm5732.73 81.42c-94.99,-226.47 -270.57,-374.9 -529.25,-446.99 265.46,-72.1 476.66,-196.78 636.11,-375.73 156.07,-178.97 235.8,-387.61 235.8,-628.49 0,-308.74 -129.77,-562.34 -387.61,-760.8 -258.7,-197.62 -578.45,-296.86 -960.99,-296.86l-1536.87 0 0 3562.28 829.53 0 0 -1441.02 586.09 0c76.31,52.58 138.23,128.92 185.72,226.44l422.4 918.57c59.36,131.47 134,230.7 225.6,296.01l893.97 0c-106.88,-72.09 -201.01,-201.86 -285.83,-387.61l-314.67 -665.8zm-1199.3 -2234.07c210.34,0 377.44,72.11 503.81,216.3 126.36,144.17 188.28,335.02 188.28,571.65 0,238.32 -61.92,430.02 -188.28,571.66 -126.37,141.64 -293.47,213.73 -503.81,213.73l-513.98 0 0 -1573.34 513.98 0zm3173.81 1617.45l1358.76 0 0 -273.1 -1358.76 0 0 -1344.35 1766.72 0 0 -274.8 -2596.23 0 0 3562.28 2645.43 0 0 -274.8 -1815.92 0 0 -1395.23zm-16170.2 1714.98c449.54,0 803.23,-122.14 1059.37,-365.55 255.29,-242.57 381.67,-569.98 381.67,-984.72l0 -2256.96 -295.17 0 0 2229.82c0,302.79 -83.96,543.67 -256.15,719.23 -171.32,178.97 -405.42,268.02 -701.41,268.02 -305.35,0 -547.07,-89.05 -726.04,-268.02 -181.5,-178.09 -270.55,-418.97 -270.55,-719.23l0 -2229.82 -829.52 0 0 2150.95c0,433.4 154.39,783.7 462.25,1050.86 307.04,271.42 700.59,405.42 1175.55,405.42zm3116.16 -44.95l0 -3562.28 -829.51 0 0 3562.28 829.51 0zm920.24 -3562.28l0 3562.28 1459.7 0c556.4,0 1023.72,-170.49 1398.62,-510.6 374.88,-340.95 561.47,-765.88 561.47,-1270.53 0,-504.66 -186.59,-929.59 -561.47,-1270.55 -374.9,-340.11 -842.22,-510.6 -1398.62,-510.6l-1459.7 0zm829.51 3287.48l0 -3012.68 543.67 0c360.47,0 648,136.57 869.37,412.22 218.82,276.5 327.4,639.51 327.4,1094.13 0,454.6 -108.58,820.16 -327.4,1094.12 -221.37,275.64 -508.9,412.21 -869.37,412.21l-543.67 0z"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-background relative selection:bg-gold selection:text-black">
      {/* Dynamic Gold Light Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gold/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-gold/3 blur-[180px] rounded-full pointer-events-none" />

      {/* HEADER */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-gold/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center">
            <Logo className="h-16 w-auto text-gold" />
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#sobre" className="text-sm font-medium text-gray-300 hover:text-gold transition-colors">O Espaço</a>
            <a href="#servicos" className="text-sm font-medium text-gray-300 hover:text-gold transition-colors">Serviços</a>
            <a href="#profissionais" className="text-sm font-medium text-gray-300 hover:text-gold transition-colors">Profissionais</a>
            <a href="#horarios" className="text-sm font-medium text-gray-300 hover:text-gold transition-colors">Horários & Local</a>
            <button 
              onClick={() => onOpenBooking()}
              className="px-6 h-11 bg-gold-gradient text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-gold/25 transition-all duration-300 active:scale-95"
            >
              Agendar Horário
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-300 hover:text-gold">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-luxury-black/95 backdrop-blur-lg border-b border-gold/10 px-4 pt-2 pb-6 flex flex-col gap-4"
          >
            <a 
              href="#sobre" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-300 py-2 hover:text-gold transition-colors border-b border-white/5"
            >
              O Espaço
            </a>
            <a 
              href="#servicos" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-300 py-2 hover:text-gold transition-colors border-b border-white/5"
            >
              Serviços
            </a>
            <a 
              href="#profissionais" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-300 py-2 hover:text-gold transition-colors border-b border-white/5"
            >
              Profissionais
            </a>
            <a 
              href="#horarios" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-300 py-2 hover:text-gold transition-colors border-b border-white/5"
            >
              Horários & Local
            </a>
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="w-full h-12 bg-gold-gradient text-white font-semibold rounded-lg active:scale-95 transition-transform"
            >
              Agendar Horário
            </button>
          </motion.div>
        )}
      </nav>

      {/* HERO SECTION */}
      <section 
        className="relative min-h-[90vh] lg:min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden py-16 md:py-24 bg-cover bg-center"
        style={{ backgroundImage: "url('/BACKGROUND HERO.png')" }}
      >
        {/* Smoky blur and gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-luxury-black via-background to-background pointer-events-none z-[1] opacity-75" />
        <div className="absolute inset-0 bg-black/65 backdrop-blur-[1.5px] z-[1] pointer-events-none" />
        {/* Solid bottom gradient to fade the layout into the background */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/95 to-transparent z-[2] pointer-events-none" />

        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(212,175,55,0.01)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(212,175,55,0.01)_1px,_transparent_1px)] bg-[size:60px_60px] pointer-events-none z-[1]" />

        <div className="max-w-7xl mx-auto w-full z-10 relative grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* LEFT COLUMN: Text Content */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6 md:space-y-8 max-w-2xl lg:max-w-none z-10 relative">

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.45, ease: "easeOut" }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-white tracking-wide leading-[1.1] mb-2"
            >
              Beleza, cuidado e <br />
              <span className="text-gold-gradient font-medium italic">praticidade</span> <br className="hidden sm:inline" />
              em um só lugar.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45, ease: "easeOut" }}
              className="text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed font-sans font-light max-w-xl"
            >
              Agende online de forma rápida e segura seu horário com nossas profissionais qualificadas. Escolha seu serviço e desfrute de um atendimento personalizado.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.45, ease: "easeOut" }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-2"
            >
              <button
                onClick={() => onOpenBooking()}
                className="w-full sm:w-auto px-8 h-14 bg-gold-gradient text-white font-bold text-base rounded-xl hover:shadow-xl hover:shadow-gold/20 hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-3"
              >
                Agendar meu horário <ArrowRight size={18} />
              </button>
              <a
                href="#servicos"
                className="w-full sm:w-auto px-8 h-14 border border-gold/30 hover:border-gold hover:bg-gold/5 text-gold font-medium rounded-xl transition-all duration-300 flex items-center justify-center"
              >
                Conhecer os serviços
              </a>
            </motion.div>
          </div>

          {/* On mobile/tablet, render the image here in the flow below the text */}
          <div className="lg:hidden w-full flex justify-center mt-8">
            <div className="relative w-full max-w-[500px] h-[350px] sm:h-[480px] overflow-hidden flex items-end justify-center">
              <img 
                src="/PROFISSIONAIS.png" 
                alt="Profissionais Cuidare" 
                className="w-full h-auto object-contain object-bottom"
              />
              {/* Fade out the bottom of the image into the background */}
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            </div>
          </div>

          {/* On desktop, leave the remaining 5 columns empty inside the grid flow */}
          <div className="hidden lg:block lg:col-span-5 pointer-events-none" />
        </div>

        {/* RIGHT COLUMN: Image of Professionals (Absolutely positioned on desktop for edge bleeding and huge scale) */}
        <div className="hidden lg:flex absolute lg:-right-16 bottom-0 h-[83%] w-full z-[3] items-end justify-end pointer-events-none">
          {/* Elegant glowing background sphere behind the image */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold/10 rounded-full blur-[120px] pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6, ease: "easeOut" }}
            className="relative h-full flex items-end justify-end"
          >
            <img 
              src="/PROFISSIONAIS.png" 
              alt="Profissionais Cuidare" 
              className="h-full w-auto max-w-none object-contain object-bottom object-right group-hover:scale-[1.02] transition-transform duration-700 ease-out"
            />
            
            {/* Overlay with soft gradient at the bottom to fade it nicely */}
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none" />
          </motion.div>
        </div>
      </section>

      {/* APRESENTAÇÃO DO ESPAÇO */}
      <section id="sobre" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-gold/5">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel border border-gold/30 text-gold text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck size={14} /> Espaço Exclusivo
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif text-white leading-tight">
              Um conceito completo de cuidado para você
            </h2>
            <p className="text-gray-300 leading-relaxed font-light font-sans">
              O <strong className="font-semibold text-white">Cuidare Studio de Beleza</strong> foi planejado para atender todas as demandas na área de beleza e bem-estar em um único endereço. 
              São <strong className="font-semibold text-white">4 andares inteiramente dedicados à sua autoestima</strong>, com infraestrutura de ponta, conforto absoluto e equipes altamente capacitadas.
            </p>
            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="glass-panel p-4 rounded-lg">
                <span className="text-3xl font-serif text-gold block mb-1">4</span>
                <span className="text-xs uppercase tracking-wider text-gray-400">Andares de estrutura</span>
              </div>
              <div className="glass-panel p-4 rounded-lg">
                <span className="text-3xl font-serif text-gold block mb-1">100%</span>
                <span className="text-xs uppercase tracking-wider text-gray-400">Normas da Vigilância</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="relative h-[450px] rounded-2xl overflow-hidden border border-gold/20 group"
          >
            {/* Elegant Background Card Stack mockup inside salon space */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
            <div className="absolute inset-0 bg-luxury-dark/50 flex flex-col justify-end p-8 z-20">
              <span className="text-gold font-medium text-sm uppercase tracking-widest mb-2 font-sans">Estrutura Premium</span>
              <h3 className="text-2xl text-white font-serif mb-3">Atendimento integrado e personalizado</h3>
              <p className="text-gray-400 text-sm font-light">
                Do design de sobrancelhas e unhas a tratamentos estéticos avançados com laser, cosmética inteligente e cronogramas capilares profundos.
              </p>
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#d4af37,_transparent_50%)] opacity-30 animate-pulse z-10" />
            <div className="w-full h-full bg-[#111] relative overflow-hidden">
              <img 
                src="/BACKGROUND HERO.png" 
                alt="Estrutura Cuidare" 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out z-0"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* CATEGORIAS & TABELA DE PREÇOS */}
      <section id="servicos" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-gold/5">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-5xl font-serif text-white mb-4">Nossos Serviços</h2>
          <p className="text-gray-400 font-light">
            Selecione uma categoria para explorar os procedimentos oferecidos e fazer seu agendamento.
          </p>
        </div>

        {/* Categories Tab Selector */}
        <div className="flex flex-wrap gap-2 justify-center mb-12 p-1.5 bg-luxury-black/60 rounded-2xl border border-gold/10 max-w-5xl mx-auto backdrop-blur-md">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="relative flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-colors duration-300 z-10"
                style={{ color: isActive ? '#000' : '#d1d5db' }}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-gold-gradient rounded-xl -z-10 shadow-lg shadow-gold/15"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
                <Icon size={16} />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Services List Table */}
        <motion.div 
          layout
          className="glass-panel rounded-2xl overflow-hidden"
        >
          <div className="px-6 py-4 bg-luxury-dark border-b border-gold/10 flex justify-between items-center">
            <span className="text-xs uppercase tracking-wider text-gold font-semibold">
              Serviço & Descrição
            </span>
            <span className="text-xs uppercase tracking-wider text-gold font-semibold hidden md:block">
              Duração
            </span>
            <span className="text-xs uppercase tracking-wider text-gold font-semibold text-right">
              Valor
            </span>
          </div>

          <div className="divide-y divide-gold/10">
            {filteredServices.length > 0 ? (
              filteredServices.map((service) => (
                <motion.div 
                  layout
                  key={service.id}
                  className="px-6 py-6 hover:bg-white/5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="md:max-w-2xl">
                    <h4 className="text-lg font-serif text-white mb-1 flex items-center gap-2">
                      {service.name}
                      {service.variablePrice && (
                        <span className="text-[10px] uppercase font-sans tracking-wide bg-gold/10 border border-gold/35 text-gold px-2 py-0.5 rounded">
                          Preço Sob Consulta
                        </span>
                      )}
                    </h4>
                    <p className="text-gray-400 text-sm font-light leading-relaxed">
                      {service.description}
                    </p>
                    {service.recommendations && (
                      <p className="text-gold/80 text-xs mt-2 italic flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-gold rounded-full inline-block" />
                        Recomendação: {service.recommendations}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-8 pt-4 md:pt-0 border-t border-white/5 md:border-none">
                    <div className="text-sm text-gray-400 md:w-24">
                      <span className="md:hidden text-xs block text-gray-500 uppercase">Duração</span>
                      {service.duration} min
                    </div>

                    <div className="text-right md:w-44">
                      <span className="md:hidden text-xs block text-gray-500 uppercase text-right">Preço</span>
                      <div className="text-gold font-serif text-lg md:text-xl font-medium">
                        {getServiceFormattedPrice(service)}
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={() => onOpenBooking(service)}
                        className="px-5 py-2.5 bg-gold/10 hover:bg-gold text-gold hover:text-black border border-gold/30 hover:border-gold rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300"
                      >
                        Agendar
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-gray-500">
                Nenhum serviço cadastrado nesta categoria.
              </div>
            )}
          </div>
        </motion.div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-500 mt-6 leading-relaxed">
          * Os valores listados acima servem como valor inicial de referência e podem sofrer alterações conforme avaliação profissional,<br />
          técnica específica empregada, comprimento e volume dos cabelos.
        </p>
      </section>

      {/* PROFISSIONAIS */}
      <section id="profissionais" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-gold/5">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-5xl font-serif text-white mb-4">Nossas Profissionais</h2>
          <p className="text-gray-400 font-light">
            Especialistas dedicadas a oferecer o melhor atendimento dentro do salão. Conheça e agende diretamente.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {professionals.map((prof) => (
            <motion.div
              whileHover={{ y: -6 }}
              key={prof.id}
              className="glass-panel rounded-2xl overflow-hidden flex flex-col justify-between h-full border border-gold/15 hover:border-gold/30 transition-all duration-300"
            >
              {/* Header block with elegant gradient profile placeholder */}
              <div className="relative p-6 bg-gradient-to-b from-luxury-dark/60 to-transparent flex items-center gap-4 border-b border-white/5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-gold/30 to-gold/5 border border-gold/20 flex items-center justify-center text-gold font-serif text-xl font-bold">
                  {prof.name[0]}
                </div>
                <div>
                  <h3 className="text-lg font-serif text-white">{prof.name}</h3>
                  <span className="text-[10px] text-gold uppercase tracking-wider font-semibold block mt-0.5">{prof.role}</span>
                </div>
              </div>

              {/* Bio & Specialties */}
              <div className="p-6 flex-grow flex flex-col justify-between gap-6">
                <div>
                  <p className="text-gray-300 text-sm font-light leading-relaxed mb-4 h-[72px] line-clamp-3 overflow-hidden text-ellipsis">
                    "{prof.bio}"
                  </p>
                  
                  <div className="flex flex-wrap gap-1.5 min-h-[50px] items-start">
                    {prof.specialties.map((spec, i) => (
                      <span key={i} className="text-[9px] px-2.5 py-1 bg-white/5 border border-white/10 text-gray-300 rounded font-medium">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    // Preselect professional in booking
                    onOpenBooking(undefined);
                  }}
                  className="w-full h-11 border border-gold/30 hover:border-gold bg-gold/10 hover:bg-gold hover:text-white text-gold text-xs font-semibold uppercase tracking-wider rounded-xl transition-all duration-300"
                >
                  Agendar com {prof.name}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HORÁRIOS & LOCALIZAÇÃO */}
      <section id="horarios" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-gold/5">
        <div className="grid md:grid-cols-2 gap-16 items-stretch">
          
          {/* HORÁRIOS DE ATENDIMENTO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-panel p-8 rounded-2xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 text-gold mb-6">
                <Clock size={24} />
                <h3 className="text-2xl font-serif text-white">Cronograma de Atendimento</h3>
              </div>
              <p className="text-gray-400 text-sm font-light mb-8">
                Trabalhamos com exclusividade de horários agendados para assegurar a melhor experiência de cuidado.
              </p>

              <div className="space-y-4">
                {/* Segunda */}
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <div className="font-semibold text-gray-300">Segunda-feira</div>
                  <div className="text-xs uppercase tracking-wider bg-gold/10 text-gold border border-gold/30 px-3 py-1 rounded-full font-bold">
                    Fechado para Faxina
                  </div>
                </div>

                {/* Terça a Sexta */}
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <div className="font-semibold text-gray-300">Terça a Sexta-feira</div>
                  <div className="text-right text-gray-300 font-sans text-sm">
                    <span className="block font-medium">08:00 às 11:00</span>
                    <span className="block font-medium">14:00 às 18:00</span>
                  </div>
                </div>

                {/* Sábado */}
                <div className="flex items-center justify-between py-3">
                  <div className="font-semibold text-gray-300">Sábado</div>
                  <div className="text-right text-gray-300 font-sans text-sm">
                    <span className="block font-medium">08:00 às 18:00</span>
                    <span className="text-[10px] text-gold uppercase tracking-wide">Sem intervalo</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gold/10">
              <p className="text-center font-serif italic text-gold text-sm">
                "Cuidar de você é a nossa missão!"
              </p>
            </div>
          </motion.div>

          {/* LOCALIZAÇÃO E CONTATO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-panel p-8 rounded-2xl flex flex-col justify-between gap-8"
          >
            <div>
              <div className="flex items-center gap-3 text-gold mb-6">
                <MapPin size={24} />
                <h3 className="text-2xl font-serif text-white">Onde Estamos</h3>
              </div>

              <div className="space-y-4 text-gray-300 text-sm">
                <div className="flex gap-3">
                  <MapPin className="text-gold shrink-0 mt-1" size={16} />
                  <div>
                    <strong className="block text-white">CUIDARE - Studio de Beleza</strong>
                    Rua Paracatu, 15, Centro - Taiobeiras/MG
                  </div>
                </div>

                <div className="flex gap-3">
                  <Phone className="text-gold shrink-0" size={16} />
                  <div>
                    <strong className="block text-white">WhatsApp Oficial</strong>
                    (38) 99100-7706
                  </div>
                </div>

                <div className="flex gap-3">
                  <Instagram className="text-gold shrink-0" size={16} />
                  <div>
                    <strong className="block text-white">Instagram</strong>
                    @cuidare.studiodebeleza
                  </div>
                </div>
              </div>
            </div>

            {/* Real interactive Google Maps iframe component */}
            <div className="h-44 rounded-xl border border-gold/20 overflow-hidden relative group">
              <iframe
                title="Mapa Cuidare"
                src="https://maps.google.com/maps?q=Rua%20Paracatu,%2015,%20Centro,%20Taiobeiras%20-%20MG&t=&z=16&ie=UTF8&iwloc=&output=embed"
                className="w-full h-full border-0 filter grayscale invert contrast-[0.9] opacity-70 group-hover:opacity-100 group-hover:grayscale-0 group-hover:invert-0 group-hover:contrast-100 transition-all duration-500"
                allowFullScreen
                loading="lazy"
              />
              <div className="absolute bottom-3 right-3 z-10">
                <a
                  href="https://share.google/q3b5XS6s53zXU6MAp"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-black/90 hover:bg-gold hover:text-white border border-gold/30 hover:border-gold text-gold text-[10px] uppercase font-bold rounded transition-colors shadow-lg"
                >
                  Abrir no Maps
                </a>
              </div>
            </div>

          </motion.div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="py-24 relative overflow-hidden border-b border-gold/5 text-center">
        <div className="max-w-4xl mx-auto px-4 z-10 relative">
          <h2 className="text-3xl sm:text-5xl font-serif text-white mb-6">Seu momento de cuidado começa aqui</h2>
          <p className="text-gray-300 font-light max-w-xl mx-auto mb-10 text-base sm:text-lg">
            Escolha o serviço desejado, encontre o melhor horário disponível e agende seu momento com exclusividade em poucos minutos.
          </p>
          <button
            onClick={() => onOpenBooking()}
            className="px-10 h-14 bg-gold text-white hover:bg-gold-light font-bold uppercase tracking-wider text-sm rounded-xl hover:shadow-xl hover:shadow-gold/20 active:scale-95 transition-all duration-300"
          >
            Agendar Meu Horário Agora
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-luxury-black/90 py-12 border-t border-gold/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-auto text-[#ffffff]" />
            <div>
              <span className="text-[8px] uppercase tracking-wider text-gray-500">Copyright © 2026</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-xs text-gray-500">
            <a href="#sobre" className="hover:text-gold transition-colors">O Espaço</a>
            <a href="#servicos" className="hover:text-gold transition-colors">Serviços</a>
            <a href="#profissionais" className="hover:text-gold transition-colors">Profissionais</a>
            <button 
              onClick={onNavigateToAdmin}
              className="text-gold/70 hover:text-gold font-semibold transition-colors flex items-center gap-1 underline"
            >
              Acesso Administrativo
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

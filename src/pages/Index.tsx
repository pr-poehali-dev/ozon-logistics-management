import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';

type Zone = 'counter' | 'storage' | 'fitting' | 'waiting' | 'overview';

type ViewPoint = {
  id: Zone;
  name: string;
  image: string;
  hotspots: Hotspot[];
};

type Hotspot = {
  id: string;
  x: number;
  y: number;
  label: string;
  type: 'navigation' | 'interaction';
  action: () => void;
  icon?: string;
};

type Order = {
  id: string;
  code: string;
  cell: string;
  status: 'pending' | 'ready' | 'issued';
  type: 'package' | 'box';
  payment: 'paid' | 'cod';
};

type Customer = {
  id: string;
  name: string;
  orderId: string;
  mood: 'happy' | 'neutral' | 'angry';
  waiting: number;
};

type GameStats = {
  salary: number;
  bonus: number;
  penalties: number;
  ordersIssued: number;
  ordersAccepted: number;
  rating: number;
  shift: number;
};

const Index = () => {
  const [currentZone, setCurrentZone] = useState<Zone>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<GameStats>({
    salary: 25000,
    bonus: 0,
    penalties: 0,
    ordersIssued: 0,
    ordersAccepted: 0,
    rating: 5.0,
    shift: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [scanCode, setScanCode] = useState('');
  const [isBreak, setIsBreak] = useState(false);
  const [time, setTime] = useState(9);
  const [isPanoramaMode, setIsPanoramaMode] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState(0);
  const panoramaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generateInitialOrders();
    const timer = setInterval(() => {
      setTime((prev) => {
        if (prev >= 21) return 9;
        return prev + 0.1;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (Math.random() > 0.95 && customers.length < 3 && !isBreak) {
      addNewCustomer();
    }
  }, [time, isBreak, customers.length, orders]);

  const generateInitialOrders = () => {
    const newOrders: Order[] = [];
    for (let i = 1; i <= 15; i++) {
      newOrders.push({
        id: `ORD-${1000 + i}`,
        code: `${Math.floor(1000 + Math.random() * 9000)}`,
        cell: `${String.fromCharCode(65 + Math.floor(Math.random() * 5))}-${Math.floor(1 + Math.random() * 20)}`,
        status: 'ready',
        type: Math.random() > 0.5 ? 'package' : 'box',
        payment: Math.random() > 0.7 ? 'cod' : 'paid',
      });
    }
    setOrders(newOrders);
  };

  const addNewCustomer = () => {
    const availableOrders = orders.filter((o) => o.status === 'ready');
    if (availableOrders.length === 0) return;

    const order = availableOrders[Math.floor(Math.random() * availableOrders.length)];
    const newCustomer: Customer = {
      id: `CUST-${Date.now()}`,
      name: `Клиент ${customers.length + 1}`,
      orderId: order.id,
      mood: 'neutral',
      waiting: 0,
    };
    setCustomers((prev) => [...prev, newCustomer]);
  };

  const acceptDelivery = () => {
    const newOrders: Order[] = [];
    const count = Math.floor(5 + Math.random() * 10);
    for (let i = 1; i <= count; i++) {
      newOrders.push({
        id: `ORD-${Date.now()}-${i}`,
        code: `${Math.floor(1000 + Math.random() * 9000)}`,
        cell: `${String.fromCharCode(65 + Math.floor(Math.random() * 5))}-${Math.floor(1 + Math.random() * 20)}`,
        status: 'pending',
        type: Math.random() > 0.5 ? 'package' : 'box',
        payment: Math.random() > 0.7 ? 'cod' : 'paid',
      });
    }

    setTimeout(() => {
      setOrders((prev) => [...prev, ...newOrders]);
      setStats((prev) => ({
        ...prev,
        ordersAccepted: prev.ordersAccepted + count,
        bonus: prev.bonus + count * 10,
      }));
      toast({
        title: '✅ Приёмка завершена',
        description: `Принято ${count} заказов. Бонус: +${count * 10}₽`,
      });
    }, 1500);

    toast({
      title: '📦 Приёмка заказов',
      description: 'Сканирование посылок...',
    });
  };

  const issueOrder = (customer: Customer) => {
    const order = orders.find((o) => o.id === customer.orderId);
    if (!order) return;

    if (order.status !== 'ready') {
      toast({
        title: '❌ Ошибка',
        description: 'Заказ ещё не готов к выдаче',
        variant: 'destructive',
      });
      return;
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: 'issued' as const } : o))
    );
    setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
    setStats((prev) => ({
      ...prev,
      ordersIssued: prev.ordersIssued + 1,
      bonus: prev.bonus + 50,
      rating: Math.min(5, prev.rating + 0.1),
    }));

    toast({
      title: '✅ Заказ выдан',
      description: `${order.id} → Ячейка ${order.cell}. Бонус: +50₽`,
    });
  };

  const processReturn = (order: Order) => {
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    setStats((prev) => ({
      ...prev,
      bonus: prev.bonus + 30,
    }));
    toast({
      title: '🔄 Возврат оформлен',
      description: `${order.id} отправлен на склад. Бонус: +30₽`,
    });
  };

  const scanOrderByCode = () => {
    const order = orders.find((o) => o.code === scanCode);
    if (order) {
      setSelectedOrder(order);
      if (order.status === 'pending') {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: 'ready' as const } : o))
        );
        toast({
          title: '✅ Заказ размещён',
          description: `${order.id} → Ячейка ${order.cell}`,
        });
      }
      setScanCode('');
    } else {
      toast({
        title: '❌ Заказ не найден',
        description: 'Проверьте код',
        variant: 'destructive',
      });
    }
  };

  const toggleBreak = () => {
    setIsBreak(!isBreak);
    toast({
      title: isBreak ? '🚀 Рабочий режим' : '☕ Перерыв',
      description: isBreak ? 'Возвращаемся к работе' : 'Табличка "Перерыв" на двери',
    });
  };

  const viewPoints: ViewPoint[] = [
    {
      id: 'counter',
      name: 'Стойка выдачи',
      image: 'https://cdn.poehali.dev/projects/c2bf80d2-82be-4989-85fc-550c0cb757ac/files/c2ae22f0-7d8c-4e64-929d-1c340f6d6492.jpg',
      hotspots: [
        { id: 'computer', x: 50, y: 45, label: 'Компьютер', type: 'interaction', action: () => {
          toast({ title: '💻 Система управления', description: 'Открыта база данных заказов' });
        }, icon: 'Monitor' },
        { id: 'scanner', x: 60, y: 55, label: 'Сканер', type: 'interaction', action: () => {
          setCurrentZone('storage');
          setIsPanoramaMode(false);
        }, icon: 'Scan' },
        { id: 'to-storage', x: 80, y: 50, label: 'На склад →', type: 'navigation', action: () => {
          setCurrentZone('storage');
        }, icon: 'ArrowRight' },
      ],
    },
    {
      id: 'storage',
      name: 'Склад со стеллажами',
      image: 'https://cdn.poehali.dev/projects/c2bf80d2-82be-4989-85fc-550c0cb757ac/files/beece54b-3e1f-44f2-86fb-fd0268ef5a74.jpg',
      hotspots: [
        { id: 'shelf-a', x: 30, y: 40, label: 'Стеллаж A', type: 'interaction', action: () => {
          toast({ title: '📦 Стеллаж A', description: `Заказов: ${orders.filter(o => o.cell.startsWith('A')).length}` });
        }, icon: 'Package' },
        { id: 'shelf-b', x: 50, y: 40, label: 'Стеллаж B', type: 'interaction', action: () => {
          toast({ title: '📦 Стеллаж B', description: `Заказов: ${orders.filter(o => o.cell.startsWith('B')).length}` });
        }, icon: 'Package' },
        { id: 'to-counter', x: 20, y: 50, label: '← К стойке', type: 'navigation', action: () => {
          setCurrentZone('counter');
        }, icon: 'ArrowLeft' },
        { id: 'accept-delivery', x: 70, y: 60, label: 'Принять посылки', type: 'interaction', action: acceptDelivery, icon: 'Truck' },
      ],
    },
  ];

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - mousePos.x;
    setRotation((prev) => prev + deltaX * 0.1);
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const renderPanoramaView = () => {
    const currentView = viewPoints.find((vp) => vp.id === currentZone);
    if (!currentView) return null;

    return (
      <div className="fixed inset-0 z-40 bg-black">
        <div
          ref={panoramaRef}
          className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={currentView.image}
            alt={currentView.name}
            className="absolute top-0 left-0 h-full w-auto min-w-full object-cover select-none"
            style={{
              transform: `translateX(calc(-50% + ${rotation}px))`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            }}
            draggable={false}
          />

          {currentView.hotspots.map((hotspot) => (
            <button
              key={hotspot.id}
              className="absolute bg-primary/90 hover:bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:scale-110 transition-all animate-pulse-glow"
              style={{
                left: `${hotspot.x}%`,
                top: `${hotspot.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                hotspot.action();
              }}
              title={hotspot.label}
            >
              <Icon name={hotspot.icon || 'Circle'} size={28} />
            </button>
          ))}

          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <Icon name="Maximize2" size={24} />
                <span className="text-xl font-heading font-bold">{currentView.name}</span>
              </div>
              <Button
                onClick={() => setIsPanoramaMode(false)}
                variant="secondary"
                size="sm"
              >
                <Icon name="X" size={16} className="mr-2" />
                Выйти из панорамы
              </Button>
            </div>
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 flex gap-2">
            {viewPoints.map((vp) => (
              <Button
                key={vp.id}
                onClick={() => setCurrentZone(vp.id)}
                variant={currentZone === vp.id ? 'default' : 'outline'}
                size="sm"
              >
                {vp.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderZoneContent = () => {
    switch (currentZone) {
      case 'counter':
        return (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
              <Icon name="Package" size={28} />
              Стойка выдачи
            </h2>
            <div className="grid gap-3">
              {customers.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <Icon name="UserX" size={48} className="mx-auto mb-2 opacity-30" />
                  <p>Клиентов нет. Ожидаем посетителей...</p>
                </Card>
              ) : (
                customers.map((customer) => {
                  const order = orders.find((o) => o.id === customer.orderId);
                  return (
                    <Card key={customer.id} className="p-4 hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              customer.mood === 'happy'
                                ? 'bg-green-100'
                                : customer.mood === 'angry'
                                ? 'bg-red-100'
                                : 'bg-blue-100'
                            }`}
                          >
                            <Icon
                              name={
                                customer.mood === 'happy'
                                  ? 'Smile'
                                  : customer.mood === 'angry'
                                  ? 'Frown'
                                  : 'User'
                              }
                              size={24}
                            />
                          </div>
                          <div>
                            <p className="font-heading font-semibold">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Заказ: {order?.id} | Код: {order?.code}
                            </p>
                            {order && (
                              <Badge variant="secondary" className="mt-1">
                                Ячейка: {order.cell}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button onClick={() => issueOrder(customer)} size="sm">
                          <Icon name="CheckCircle" size={16} className="mr-1" />
                          Выдать
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        );

      case 'storage':
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
                <Icon name="Warehouse" size={28} />
                Склад и стеллажи
              </h2>
              <Button onClick={acceptDelivery}>
                <Icon name="Truck" size={16} className="mr-2" />
                Принять курьера
              </Button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Введите код заказа"
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg font-body"
                onKeyPress={(e) => e.key === 'Enter' && scanOrderByCode()}
              />
              <Button onClick={scanOrderByCode}>
                <Icon name="Scan" size={16} className="mr-2" />
                Сканировать
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {orders.slice(0, 24).map((order) => (
                <Card
                  key={order.id}
                  className={`p-3 cursor-pointer transition-all hover:scale-105 ${
                    order.status === 'issued'
                      ? 'opacity-30'
                      : order.status === 'ready'
                      ? 'border-green-500 border-2'
                      : 'border-yellow-500 border-2'
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name={order.type === 'box' ? 'Box' : 'Package'} size={20} />
                    <Badge
                      variant={
                        order.status === 'issued'
                          ? 'secondary'
                          : order.status === 'ready'
                          ? 'default'
                          : 'outline'
                      }
                      className="text-xs"
                    >
                      {order.status === 'issued' ? '✓' : order.status === 'ready' ? '✓' : '⏳'}
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold font-heading">{order.cell}</p>
                  <p className="text-xs text-muted-foreground">#{order.code}</p>
                </Card>
              ))}
            </div>

            {selectedOrder && (
              <Card className="p-4 border-primary border-2 animate-scale-in">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-heading font-bold text-lg">{selectedOrder.id}</p>
                    <p className="text-sm">
                      Ячейка: <span className="font-semibold">{selectedOrder.cell}</span>
                    </p>
                    <p className="text-sm">Код: {selectedOrder.code}</p>
                    <Badge className="mt-2">
                      {selectedOrder.payment === 'cod' ? 'Оплата при получении' : 'Оплачено'}
                    </Badge>
                  </div>
                  {selectedOrder.status === 'issued' && (
                    <Button onClick={() => processReturn(selectedOrder)} variant="outline">
                      <Icon name="RotateCcw" size={16} className="mr-2" />
                      Возврат
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>
        );

      case 'fitting':
        return (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
              <Icon name="Shirt" size={28} />
              Примерочные
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((num) => (
                <Card
                  key={num}
                  className="p-6 text-center hover:border-primary transition-colors cursor-pointer"
                >
                  <Icon name="DoorOpen" size={48} className="mx-auto mb-2 text-primary" />
                  <p className="font-heading font-semibold">Кабинка {num}</p>
                  <Badge variant="outline" className="mt-2">
                    Свободна
                  </Badge>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'waiting':
        return (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
              <Icon name="Armchair" size={28} />
              Зона ожидания
            </h2>
            <Card className="p-8 text-center">
              <Icon name="Coffee" size={64} className="mx-auto mb-4 text-primary opacity-50" />
              <p className="text-lg font-body text-muted-foreground">
                Уютное пространство для клиентов
              </p>
              <div className="flex justify-center gap-4 mt-6">
                <Badge variant="outline" className="text-base px-4 py-2">
                  🛋️ Пуфы
                </Badge>
                <Badge variant="outline" className="text-base px-4 py-2">
                  📱 WiFi
                </Badge>
                <Badge variant="outline" className="text-base px-4 py-2">
                  💡 Освещение
                </Badge>
              </div>
            </Card>
          </div>
        );

      case 'overview':
      default:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center py-8">
              <h1 className="text-5xl font-heading font-bold text-primary mb-2">
                Симулятор ПВЗ OZON
              </h1>
              <p className="text-xl text-muted-foreground font-body">
                Управляйте пунктом выдачи заказов
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-6 text-center hover:border-primary transition-all cursor-pointer hover:scale-105">
                <Icon name="Package" size={40} className="mx-auto mb-2 text-primary" />
                <p className="text-3xl font-heading font-bold">{stats.ordersIssued}</p>
                <p className="text-sm text-muted-foreground">Заказов выдано</p>
              </Card>
              <Card className="p-6 text-center hover:border-secondary transition-all cursor-pointer hover:scale-105">
                <Icon name="TrendingUp" size={40} className="mx-auto mb-2 text-secondary" />
                <p className="text-3xl font-heading font-bold">{stats.ordersAccepted}</p>
                <p className="text-sm text-muted-foreground">Заказов принято</p>
              </Card>
              <Card className="p-6 text-center hover:border-primary transition-all cursor-pointer hover:scale-105">
                <Icon name="Star" size={40} className="mx-auto mb-2 text-yellow-500" />
                <p className="text-3xl font-heading font-bold">{stats.rating.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Рейтинг ПВЗ</p>
              </Card>
              <Card className="p-6 text-center hover:border-green-500 transition-all cursor-pointer hover:scale-105">
                <Icon name="Wallet" size={40} className="mx-auto mb-2 text-green-600" />
                <p className="text-3xl font-heading font-bold">
                  {(stats.salary + stats.bonus - stats.penalties).toLocaleString()}₽
                </p>
                <p className="text-sm text-muted-foreground">Доход</p>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
                <Icon name="MapPin" size={24} className="text-primary" />
                Карта ПВЗ
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { zone: 'counter' as Zone, icon: 'Package', label: 'Стойка выдачи', color: 'bg-blue-100' },
                  { zone: 'storage' as Zone, icon: 'Warehouse', label: 'Склад', color: 'bg-purple-100' },
                  { zone: 'fitting' as Zone, icon: 'Shirt', label: 'Примерочные', color: 'bg-pink-100' },
                  { zone: 'waiting' as Zone, icon: 'Armchair', label: 'Зона ожидания', color: 'bg-green-100' },
                ].map(({ zone, icon, label, color }) => (
                  <Button
                    key={zone}
                    onClick={() => setCurrentZone(zone)}
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform"
                  >
                    <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center`}>
                      <Icon name={icon as any} size={24} />
                    </div>
                    <span className="text-sm font-semibold">{label}</span>
                  </Button>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-body">Доход за смену</p>
                  <div className="flex items-baseline gap-4 mt-2">
                    <p className="text-3xl font-heading font-bold">
                      {(stats.salary + stats.bonus - stats.penalties).toLocaleString()}₽
                    </p>
                    <p className="text-sm text-green-600">+{stats.bonus}₽ бонусы</p>
                    {stats.penalties > 0 && (
                      <p className="text-sm text-red-600">-{stats.penalties}₽ штрафы</p>
                    )}
                  </div>
                </div>
                <Icon name="TrendingUp" size={48} className="text-primary opacity-50" />
              </div>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 font-body">
      {isPanoramaMode && renderPanoramaView()}
      
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => {
                  setCurrentZone('overview');
                  setIsPanoramaMode(false);
                }}
                variant={currentZone === 'overview' ? 'default' : 'ghost'}
                size="sm"
              >
                <Icon name="Home" size={16} className="mr-2" />
                Обзор
              </Button>
              <Button
                onClick={() => setIsPanoramaMode(!isPanoramaMode)}
                variant={isPanoramaMode ? 'default' : 'outline'}
                size="sm"
              >
                <Icon name="Maximize2" size={16} className="mr-2" />
                Панорама 360°
              </Button>
              <div className="hidden md:flex items-center gap-2">
                <Icon name="Clock" size={16} className="text-muted-foreground" />
                <span className="text-sm font-semibold">
                  {Math.floor(time)}:00
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="outline" className="hidden md:flex">
                <Icon name="Users" size={14} className="mr-1" />
                Клиентов: {customers.length}
              </Badge>
              <Badge variant="outline" className="hidden md:flex">
                <Icon name="Package" size={14} className="mr-1" />
                Заказов: {orders.filter((o) => o.status !== 'issued').length}
              </Badge>
              <Button
                onClick={toggleBreak}
                variant={isBreak ? 'destructive' : 'outline'}
                size="sm"
              >
                <Icon name={isBreak ? 'Play' : 'Pause'} size={16} className="mr-2" />
                {isBreak ? 'В работу' : 'Перерыв'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {renderZoneContent()}
      </div>

      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 border-2 border-primary/20 z-30">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
          <p className="text-xs font-semibold text-muted-foreground">КАМЕРА НАБЛЮДЕНИЯ</p>
        </div>
        <p className="text-xs text-muted-foreground">Работодатель онлайн</p>
      </div>
    </div>
  );
};

export default Index;
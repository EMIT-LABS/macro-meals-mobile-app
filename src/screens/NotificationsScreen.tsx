import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  FlatList,
  ViewToken,
  Platform,
} from "react-native";
import NotificationItem from "../components/NotificationItem";
import CustomSafeAreaView from "../components/CustomSafeAreaView";
import Header from "../components/Header";
import { notificationService } from "../services/notificationsService";
import { usePosthog } from "@macro-meals/posthog_service/src";

type APINotification = {
  id: string;
  created_at: string;
  user_id: string;
  type: string;
  subtype: string;
  title: string;
  body: string;
  status: string;
  delivered_at: string;
};

type Notification = {
  id: string;
  title: string;
  body: string;
  timeAgo: string;
  timestamp: Date;
  read: boolean;
};

type NotificationsByDay = {
  [section: string]: Notification[];
};

function groupByDay(notifications: Notification[]): NotificationsByDay {
  const now = new Date();
  const sections: NotificationsByDay = {};

  notifications.forEach((notif) => {
    const notifDate = notif.timestamp;
    const notifDay = new Date(
      notifDate.getFullYear(),
      notifDate.getMonth(),
      notifDate.getDate()
    );
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor(
      (nowDay.getTime() - notifDay.getTime()) / (1000 * 60 * 60 * 24)
    );

    let section = "";
    if (diffDays === 0) {
      section = "Today";
    } else if (diffDays === 1) {
      section = "Yesterday";
    } else if (diffDays === 2) {
      section = "Two days ago";
    } else {
      section = notifDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    if (!sections[section]) {
      sections[section] = [];
    }
    sections[section].push(notif);
  });

  return sections;
}

// Utility to get time ago string from timestamp
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const posthog = usePosthog()

  // To prevent marking as read multiple times
  const markedAsReadRef = useRef<Set<string>>(new Set());

  const fetchNotifs = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const data = await notificationService.getNotifications(pageNum, 20);
      const apiNotifications: APINotification[] = Array.isArray(data?.results)
        ? data.results
        : [];
      const formatted: Notification[] = apiNotifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        timeAgo: n.created_at ? getTimeAgo(new Date(n.created_at)) : "",
        timestamp: n.created_at ? new Date(n.created_at) : new Date(),
        read: n.status === "read",
      }));
      if (pageNum === 1) {
        setNotifications(formatted);
      } else {
        setNotifications((prev) => [...prev, ...formatted]);
      }
      setHasNext(data.pagination?.has_next ?? false);
      setPage(pageNum);
    } catch (e: any) {
      console.error("ERROR fetching notifications:", e);
      setError(e?.message || "Could not fetch notifications.");
      Alert.alert("Error", e?.message || "Could not fetch notifications.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  useEffect(() => {
    fetchNotifs(1);
  }, []);

  // FlatList wants a flat array, so group, then flatten with section headers
  const notificationsByDay = useMemo(
    () => groupByDay(notifications),
    [notifications]
  );
  const flatListData: Array<
    { type: "header"; section: string } | { type: "notif"; notif: Notification }
  > = useMemo(() => {
    const arr: Array<
      | { type: "header"; section: string }
      | { type: "notif"; notif: Notification }
    > = [];
    Object.keys(notificationsByDay).forEach((section) => {
      arr.push({ type: "header", section });
      notificationsByDay[section].forEach((notif) =>
        arr.push({ type: "notif", notif })
      );
    });
    return arr;
  }, [notificationsByDay]);


  useEffect(()=>{
    posthog.track({
      name:'notifications_screen_viewed',
      properties:{
        platform:Platform.OS
      }
    })
  })

  // Mark notifications as read when they become visible
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      viewableItems.forEach(({ item }) => {
        if (
          item.type === "notif" &&
          !item.notif.read &&
          !markedAsReadRef.current.has(item.notif.id)
        ) {
          markedAsReadRef.current.add(item.notif.id);
          notificationService
            .markAsRead(item.notif.id)
            .then(() => {
              setNotifications((prev) =>
                prev.map((n) =>
                  n.id === item.notif.id ? { ...n, read: true } : n
                )
              );
            })
            .catch(() => {
              // Optional: handle error, maybe remove from markedAsReadRef to retry later
            });
        }
      });
    },
    []
  );


  if (loading) {
    return (
      <CustomSafeAreaView>
        <Header title="Notifications" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#009688" />
        </View>
      </CustomSafeAreaView>
    );
  }

  if (error) {
    return (
      <CustomSafeAreaView>
        <Header title="Notifications" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-[#e53e3e] font-sans-medium">{error}</Text>
        </View>
      </CustomSafeAreaView>
    );
  }
  // Empty state handling
  if (notifications.length === 0) {
    return (
      <CustomSafeAreaView>
        <Header title="Notifications" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg px-8 text-[#000000] opacity-65 font-sans-medium">
            Your progress towards your Macro goals will appear here
          </Text>
        </View>
      </CustomSafeAreaView>
    );
  }

  return (
    <CustomSafeAreaView className="flex-1">
      <Header title="Notifications" />
      <FlatList
        data={flatListData}
        renderItem={({ item }) =>
          item.type === "header" ? (
            <Text className="py-4 px-4 text-base font-sans-medium text-[#000000]">
              {item.section}
            </Text>
          ) : (
            <NotificationItem
              text={item.notif.title}
              body={item.notif.body}
              timeAgo={item.notif.timeAgo}
              read={item.notif.read}
            />
          )
        }
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        style={{ backgroundColor: "#F2F2F2", flex: 1 }}
        contentContainerStyle={{ paddingBottom: 60 }}
        onEndReached={() => {
          if (hasNext && !loadingMore) {
            fetchNotifs(page + 1);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator className="my-4" /> : null}
      />
    </CustomSafeAreaView>
  );
};

export default NotificationsScreen;

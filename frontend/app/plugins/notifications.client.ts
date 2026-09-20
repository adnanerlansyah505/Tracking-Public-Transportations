/**
 * Keeps the notification socket in sync with the session: connect once the user
 * is signed in, tear down on sign-out, and toast anything that arrives live.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const auth = useAuthStore();
  const notifications = useNotificationsStore();
  const toast = useToast();

  let loadedFor: string | null = null;

  watch(
    () => auth.isAuthenticated,
    (isAuthenticated) => {
      nuxtApp.runWithContext(async () => {
        if (isAuthenticated && auth.accessToken) {
          notifications.connect(auth.accessToken);

          if (loadedFor !== auth.accessToken) {
            loadedFor = auth.accessToken;

            try {
              await notifications.fetch();
            } catch {
              // Offline or the API is down — the socket will still deliver new ones.
            }
          }

          return;
        }

        loadedFor = null;
        notifications.reset();
      });
    },
    { immediate: true },
  );

  watch(
    () => notifications.latest,
    (item) => {
      if (!item) return;

      toast.add({
        title: item.title,
        description: item.body ?? undefined,
        icon: 'i-lucide-bell',
        color: 'primary',
      });
    },
  );
});

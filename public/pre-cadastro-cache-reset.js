(function () {
  if (!window.location.pathname.startsWith('/pre-cadastro')) return

  var resetKey = 'mx-pre-cadastro-cache-reset-v4'
  var alreadyReset = false
  var clearCaches = []

  try {
    alreadyReset = window.sessionStorage.getItem(resetKey) === '1'
  } catch (error) {
    // Storage can be blocked by browser privacy settings. Cache cleanup must continue.
  }

  if ('serviceWorker' in navigator) {
    clearCaches.push(
      navigator.serviceWorker
        .getRegistrations()
        .then(function (registrations) {
          return Promise.all(
            registrations.map(function (registration) {
              return registration.unregister()
            }),
          )
        })
        .catch(function () {}),
    )
  }

  if ('caches' in window) {
    clearCaches.push(
      caches
        .keys()
        .then(function (cacheNames) {
          return Promise.all(
            cacheNames.map(function (cacheName) {
              return caches.delete(cacheName)
            }),
          )
        })
        .catch(function () {}),
    )
  }

  Promise.all(clearCaches).then(function () {
    if (alreadyReset || !navigator.serviceWorker || !navigator.serviceWorker.controller) return

    try {
      window.sessionStorage.setItem(resetKey, '1')
    } catch (error) {
      // A blocked sessionStorage must not prevent the cache-busting reload.
    }

    var url = new URL(window.location.href)
    url.searchParams.set('cache_bust', String(Date.now()))
    window.location.replace(url.toString())
  })
})()

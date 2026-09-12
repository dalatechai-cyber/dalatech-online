import React from 'react';
import { Link } from 'react-router-dom';

export default function Setup() {
  const [isSDKLoaded, setIsSDKLoaded] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Initialize Facebook SDK
  React.useEffect(() => {
    let mounted = true;
    // Load Facebook SDK
    window.fbAsyncInit = function () {
      FB.init({
        appId: '1380702870025418',
        xfbml: true,
        version: 'v18.0'
      });
      if (mounted) setIsSDKLoaded(true);
    };

    // Load the SDK script
    (function (d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));

    return () => {
      mounted = false;
    };
  }, []);

  const handleConnectFacebook = () => {
    if (!isSDKLoaded) {
      console.error('Facebook SDK not loaded yet');
      return;
    }

    setIsLoading(true);

    FB.login(
      function (response) {
        setIsLoading(false);
        // The access token is deliberately not logged: a console line is easy
        // to paste into a screenshot, and the reviewer only needs the status.
        if (response.authResponse) {
          console.log('Facebook authorization granted for user', response.authResponse.userID);
        } else {
          console.log('User cancelled login or did not fully authorize.');
        }
      },
      { scope: 'pages_messaging' }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Setup</h1>
          <p className="text-zinc-600 text-sm mb-8">
            Connect your Facebook Page for messaging
          </p>

          <div className="bg-zinc-50 rounded-xl p-4 mb-8">
            <p className="text-xs text-zinc-500 font-mono break-all">
              App ID: 1380702870025418
            </p>
          </div>

          <button
            onClick={handleConnectFacebook}
            disabled={!isSDKLoaded || isLoading}
            className={[
              "w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200",
              isSDKLoaded && !isLoading
                ? "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] cursor-pointer"
                : "bg-zinc-400 cursor-not-allowed"
            ].join(" ")}
          >
            {!isSDKLoaded
              ? "Loading Facebook SDK..."
              : isLoading
              ? "Connecting..."
              : "Connect Facebook Page"}
          </button>

          <p className="text-xs text-zinc-500 mt-6">
            Check the browser console for authorization response details.
          </p>

          <Link
            to="/"
            className="inline-block mt-6 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

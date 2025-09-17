import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '../lib/session';

export default function Index() {
	const [ready, setReady] = useState(false);
	const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

	useEffect(() => {
		(async () => {
			const user = await getCurrentUser();
			setLoggedIn(!!user);
			setReady(true);
		})();
	}, []);

	if (!ready) return null;
	if (!loggedIn) return <Redirect href="/auth" />;
	return <Redirect href="/(tabs)/trips" />;
}




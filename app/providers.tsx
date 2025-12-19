"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PHProvider } from "./posthog-provider";
import ChangelogManager from "@/components/ChangelogManager";
import { LazyMotion, domMax } from "framer-motion";

const loadFeatures = () => import("framer-motion").then((res) => res.domMax);

export default function Providers({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 1000 * 60 * 5,
						refetchOnWindowFocus: false,
					},
				},
			})
	);

	return (
		<PHProvider>
			<QueryClientProvider client={queryClient}>
				<LazyMotion features={loadFeatures} strict>
					{children}
					<ChangelogManager />
					<ReactQueryDevtools initialIsOpen={false} />
				</LazyMotion>
			</QueryClientProvider>
		</PHProvider>
	);
}

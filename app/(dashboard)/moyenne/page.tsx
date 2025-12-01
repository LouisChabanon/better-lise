import { getGradeData } from "@/actions/GetGrades";
import GradeSimulator from "@/components/simulation/GradeSimulator";
import ProtectedView from "@/components/ProtectedView";
import { verifySession } from "@/lib/sessions";
import { CalculatorOutlined } from "@ant-design/icons";

export const metadata = {
	title: "Mes Moyennes",
};

export default async function MoyennePage() {
	const session = await verifySession();

	// Fetch grades (false = don't force reload from scraping, use DB cache)
	const gradesRequest = await getGradeData(false);
	const grades =
		gradesRequest.success && gradesRequest.data ? gradesRequest.data : [];

	return (
		<ProtectedView session={session} title="Simulateur">
			<div className="flex flex-col h-full max-w-4xl mx-auto">
				<div className="flex flex-col gap-2 mb-8">
					<h2 className="text-2xl font-bold text-textPrimary flex items-center gap-3">
						Mes Moyennes
					</h2>
					<p className="text-textTertiary text-sm max-w-2xl flex flex-col">
						Ajoutez des notes hypothétiques pour voir leur impact sur vos
						moyennes.
						<span className="opacity-70 text-xs italic">
							*Modifiez les coéfficients en fonction de ceux disponibles sur
							Savoir
						</span>
					</p>
				</div>

				<GradeSimulator initialGrades={grades} />
			</div>
		</ProtectedView>
	);
}

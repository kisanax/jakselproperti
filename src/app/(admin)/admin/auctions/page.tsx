import { getAuctionRecords } from "@/lib/auction-records";
import AuctionList from "./AuctionList";
export const dynamic = "force-dynamic";
export default async function Page() { return <AuctionList records={await getAuctionRecords()} />; }

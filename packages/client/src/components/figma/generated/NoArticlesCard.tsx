import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardFooter } from "@/components/ui/card"
import { Upload } from "lucide-react"

export default function NoArticlesCard() {
  return (
    <Card className="flex flex-col gap-6">
      <CardHeader className="flex gap-2 px-6">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-base font-bold text-card-foreground leading-none">
            No Articles Found
          </h3>
          <p className="text-sm text-muted-foreground leading-5">
            Upload your knowledge base and unlock instant chat with your company's articles.
          </p>
        </div>
      </CardHeader>

      <CardFooter className="px-6">
        <Button className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Articles
        </Button>
      </CardFooter>
    </Card>
  )
}

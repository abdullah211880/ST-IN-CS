import { useGetOverviewStats, useGetRecentActivity, useGetTopicStats, getGetOverviewStatsQueryKey, getGetRecentActivityQueryKey, getGetTopicStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Database, FileText, MessageSquare, Clock, Plus, Zap, PieChart } from "lucide-react";
import { useLang } from "@/contexts/language-context";

export default function Home() {
  const [, setLocation] = useLocation();
  const { t, dir } = useLang();

  const { data: stats, isLoading: statsLoading } = useGetOverviewStats({
    query: { queryKey: getGetOverviewStatsQueryKey() }
  });
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey() }
  });
  const { data: topics, isLoading: topicsLoading } = useGetTopicStats({
    query: { queryKey: getGetTopicStatsQueryKey() }
  });

  const statCards = [
    { titleKey: "statTotalDocs"  as const, value: stats?.totalDocuments,                                            icon: FileText,      descKey: "statIndexed"     as const },
    { titleKey: "statChunks"     as const, value: stats?.totalChunks,                                               icon: Database,      descKey: "statEmbeddings"  as const },
    { titleKey: "statQuestions"  as const, value: stats?.totalQuestions,                                            icon: MessageSquare, descKey: "statAllSessions" as const },
    { titleKey: "statAvgTime"    as const, value: stats?.avgAnswerTimeMs ? `${(stats.avgAnswerTimeMs/1000).toFixed(2)}s` : null, icon: Zap, descKey: "statDuration"  as const },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8" dir={dir}>
      <div className="max-w-6xl mx-auto space-y-8">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("homeTitle")}</h1>
            <p className="text-muted-foreground mt-1">{t("homeSubtitle")}</p>
          </div>
          <Button onClick={() => setLocation('/sessions')} className="shadow-sm">
            <Plus className="w-4 h-4 me-2" />
            {t("homeNewSession")}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <Card key={i} className="glow-card bg-card/60 backdrop-blur-sm">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-primary/15 text-primary rounded-md ring-1 ring-primary/20">
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-20 mb-1" />
                  ) : (
                    <div className="text-3xl font-bold tracking-tight">{stat.value ?? 0}</div>
                  )}
                  <p className="text-sm font-medium text-muted-foreground mt-1">{t(stat.titleKey)}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{t(stat.descKey)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 glow-card bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t("homeRecentActivity")}</CardTitle>
              <CardDescription>{t("homeRecentDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : !activity || activity.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-lg">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-foreground">{t("homeNoActivity")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t("homeStartSession")}</p>
                  <Button variant="outline" className="mt-4" onClick={() => setLocation('/sessions')}>
                    {t("homeGoToSessions")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {activity.map((item) => (
                    <div key={item.id} className="group relative flex gap-4 pb-6 last:pb-0 border-b last:border-0 border-border/50">
                      <div className="mt-1">
                        <div className="w-2 h-2 rounded-full bg-primary/50 mt-2" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <Link href={`/sessions/${item.sessionId}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                            {item.sessionTitle}
                            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-foreground">"{item.question}"</p>
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{item.answer}</p>
                        {item.sourceCount > 0 && (
                          <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                            {item.sourceCount} {item.sourceCount !== 1 ? t("homeSources") : t("homeSource")}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="glow-card bg-primary/5 border-primary/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>{t("homeQuickStart")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t("homeQuickDesc")}</p>
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-background border text-xs font-bold flex items-center justify-center flex-shrink-0">1</div>
                    <div>
                      <h4 className="text-sm font-medium">{t("homeStep1Title")}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{t("homeStep1Desc")}</p>
                      <Button variant="link" className="h-auto p-0 text-xs mt-1" onClick={() => setLocation('/documents')}>{t("homeGoToDocs")}</Button>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-background border text-xs font-bold flex items-center justify-center flex-shrink-0">2</div>
                    <div>
                      <h4 className="text-sm font-medium">{t("homeStep2Title")}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{t("homeStep2Desc")}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-background border text-xs font-bold flex items-center justify-center flex-shrink-0">3</div>
                    <div>
                      <h4 className="text-sm font-medium">{t("homeStep3Title")}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{t("homeStep3Desc")}</p>
                      <Button variant="link" className="h-auto p-0 text-xs mt-1" onClick={() => setLocation('/sessions')}>{t("homeStartSession2")}</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glow-card bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><PieChart className="w-4 h-4" /> {t("homeTopTopics")}</CardTitle>
              </CardHeader>
              <CardContent>
                {topicsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : !topics?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("homeNoTopics")}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {topics.slice(0, 10).map((topic, i) => (
                      <Badge key={i} variant="secondary" className="text-xs py-1 px-2 flex gap-2">
                        <span className="font-semibold">{topic.topic}</span>
                        <span className="text-muted-foreground">{topic.chunkCount} {t("homeChunks")}</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}

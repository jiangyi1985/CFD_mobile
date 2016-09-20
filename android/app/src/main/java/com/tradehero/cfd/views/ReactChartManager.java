package com.tradehero.cfd.views;

import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.drawable.Drawable;
import android.support.v4.content.ContextCompat;
import android.util.Log;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewGroupManager;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.github.mikephil.charting.components.LimitLine;
import com.github.mikephil.charting.components.XAxis;
import com.github.mikephil.charting.components.YAxis;
import com.github.mikephil.charting.data.CandleData;
import com.github.mikephil.charting.data.CandleDataSet;
import com.github.mikephil.charting.data.CandleEntry;
import com.github.mikephil.charting.data.CombinedData;
import com.github.mikephil.charting.data.Entry;
import com.github.mikephil.charting.data.LineData;
import com.github.mikephil.charting.data.LineDataSet;
import com.github.mikephil.charting.formatter.XAxisValueFormatter;
import com.github.mikephil.charting.interfaces.datasets.ICandleDataSet;
import com.github.mikephil.charting.interfaces.datasets.ILineDataSet;
import com.github.mikephil.charting.utils.ViewPortHandler;
import com.tradehero.cfd.MainActivity;
import com.tradehero.cfd.R;
import com.tradehero.cfd.views.chartDrawer.base.ChartDrawerBuilder;
import com.tradehero.cfd.views.chartDrawer.base.ChartDrawerConstants;
import com.tradehero.cfd.views.chartDrawer.base.IChartDrawer;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.GregorianCalendar;

/**
 * @author <a href="mailto:sam@tradehero.mobi"> Sam Yu </a>
 */
public class ReactChartManager extends ViewGroupManager<ReactChart> {

    private float LINE_WIDTH = 0.5f; //竖线 分割 ｜分时｜10分钟｜2小时｜5日｜1月｜
    private float LINE_WIDTH_PRICE = 1.5f; //行情走势曲线线粗
    private static final String REACT_CLASS = "LineChart";

    private ChartDrawerConstants.CHART_TYPE mChartType = ChartDrawerConstants.CHART_TYPE.today;

    @Override
    protected ReactChart createViewInstance(ThemedReactContext reactContext) {

        ReactChart chart = new ReactChart(reactContext);
        chart.setDrawGridBackground(false);
        chart.setDragEnabled(true);
        chart.setScaleEnabled(true);
//        chart.setTouchEnabled(true);
        chart.getLegend().setEnabled(false);
        chart.setDoubleTapToZoomEnabled(false);


        chart.setExtraLeftOffset(12);
        chart.setExtraRightOffset(12);

        chart.getAxisLeft().removeAllLimitLines();
        chart.getAxisRight().removeAllLimitLines();
        chart.getXAxis().removeAllLimitLines();
        chart.getAxisLeft().setDrawLimitLinesBehindData(false);
        chart.getAxisRight().setDrawLimitLinesBehindData(false);
        chart.getXAxis().setDrawLimitLinesBehindData(false);
        chart.getAxisLeft().setDrawGridLines(false);
        chart.getAxisRight().setDrawGridLines(false);
        chart.getXAxis().setDrawGridLines(true);
        chart.getAxisLeft().setAxisLineColor(ChartDrawerConstants.CHART_BORDER_COLOR);
        chart.getAxisRight().setAxisLineColor(ChartDrawerConstants.CHART_BORDER_COLOR);
        chart.getXAxis().setAxisLineColor(ChartDrawerConstants.CHART_BORDER_COLOR);
        chart.getAxisLeft().setTextColor(ChartDrawerConstants.CHART_TEXT_COLOR);
        chart.getAxisRight().setTextColor(ChartDrawerConstants.CHART_TEXT_COLOR);
        chart.getXAxis().setTextColor(ChartDrawerConstants.CHART_TEXT_COLOR);
        chart.getXAxis().setTextSize(8f);
        chart.getAxisLeft().setSpaceTop(20);
        chart.getAxisLeft().setSpaceBottom(20);
        chart.getAxisRight().setSpaceTop(20);
        chart.getAxisRight().setSpaceBottom(20);

        return chart;

    }

    @ReactProp(name = "data")
    public void setData(ReactChart chart, String stockInfoData) {
        if (chart != null && stockInfoData != null && stockInfoData.length() > 0) {

            try {
                JSONObject stockInfoObject = new JSONObject(stockInfoData);
                if (!stockInfoObject.has("priceData")) {
                    return;
                }

                JSONArray chartDataList = stockInfoObject.getJSONArray("priceData");


                ArrayList<String> xVals = new ArrayList<String>();
                ArrayList<CandleEntry> yVals = new ArrayList<CandleEntry>();
                ArrayList<Entry> yVals2 = new ArrayList<Entry>();

                float minVal = Float.MAX_VALUE;
                float maxVal = Float.MIN_VALUE;

                //TODO: If you want to enable Drawer, undo-comment the following lines.
                /*
                IChartDrawer drawer = ChartDrawerBuilder.createDrawer(mChartType);
                if(drawer != null){
                    drawer.draw(chart, stockInfoObject, chartDataList);
                    return;
                }
                */

//                if (mChartType == CHART_TYPE.tenM) {
//                    Calendar firstDate = timeStringToCalendar(chartDataList.getJSONObject(0).getString("time"));
//                    Calendar lastDate = timeStringToCalendar(chartDataList.getJSONObject(chartDataList.length() - 1).getString("time"));
//                    long distance = (lastDate.getTimeInMillis() - firstDate.getTimeInMillis()) / 1000;
//
//                    if (distance > TEN_MINUTE_POINT_NUMBER) {
//                        firstDate.add(Calendar.MILLISECOND, (int) (1000 * (distance - TEN_MINUTE_POINT_NUMBER)));
//                        distance = TEN_MINUTE_POINT_NUMBER;
//                    }
//
//                    for (int i = 0; i <= distance + 1; i++) {
//                        xVals.add((i) + "");
//                    }
//
//                    for (int i = 0; i < chartDataList.length(); i++) {
//                        Calendar date = timeStringToCalendar(chartDataList.getJSONObject(i).getString("time"));
//
//                        long distToStart = (date.getTimeInMillis() - firstDate.getTimeInMillis()) / 1000;
//
//                        if (distToStart >= 0) {
//
//                            float val = (float) (chartDataList.getJSONObject(i).getDouble("p"));
//                            if (val > maxVal) {
//                                maxVal = val;
//                            }
//                            if (val < minVal) {
//                                minVal = val;
//                            }
//
//                            if (yVals.size() == 0) {
//                                yVals.add(new CandleEntry(0, val + 2, val - 1, val + 1, val - 1));
//                                yVals2.add(new Entry(val, 0));
//                            } else {
//                                yVals.add(new CandleEntry((int) distToStart, val + 2, val - 2, val + 1, val - 1));
//                                yVals2.add(new Entry(val, (int) distToStart));
//                            }
//                        }
//                    }
//                } else {
                for (int i = 0; i < chartDataList.length(); i++) {
                    xVals.add((i) + "");
                }
                for (int i = 0; i < chartDataList.length(); i++) {


                    if(isCandleChart()){
                        float open = (float) (chartDataList.getJSONObject(i).getDouble("Open"));
                        float close = (float) (chartDataList.getJSONObject(i).getDouble("Close"));
                        float high = (float) (chartDataList.getJSONObject(i).getDouble("High"));
                        float low = (float) (chartDataList.getJSONObject(i).getDouble("Low"));


                        if (high > maxVal) {
                            maxVal = high;
                        }
                        if (high < minVal) {
                            minVal = high;
                        }

                        if (low > maxVal) {
                            maxVal = low;
                        }
                        if (low < minVal) {
                            minVal = low;
                        }

                        yVals.add(new CandleEntry(i, high, low, open, close));

                    }else {
                        float val = (float) (chartDataList.getJSONObject(i).getDouble("p"));
                        yVals2.add(new Entry(val, i));
                        if (val > maxVal) {
                            maxVal = val;
                        }
                        if (val < minVal) {
                            minVal = val;
                        }
                    }

                }

                minVal = Math.min(minVal, (float) stockInfoObject.getDouble("preClose"));
                maxVal = Math.max(maxVal, (float) stockInfoObject.getDouble("preClose"));
//                }

                minVal -= (maxVal - minVal) / 5;
                maxVal += (maxVal - minVal) / 5;

                int[] circleColors = {Color.TRANSPARENT};
                if (yVals.size() > 0 && stockInfoObject.getBoolean("isOpen")) {
                    circleColors = new int[yVals.size()];
                    for (int i = 0; i < yVals.size(); i++) {
                        circleColors[i] = Color.TRANSPARENT;
                    }
                    circleColors[yVals.size() - 1] = Color.WHITE;
                }

                // create a dataset and give it a type
                CandleDataSet set1 = new CandleDataSet(yVals, "DataSet 1");
                ArrayList<ICandleDataSet> dataSets = new ArrayList<ICandleDataSet>();
                set1.setNeutralColor(ChartDrawerConstants.CANDEL_NEUTRAL);//平
                set1.setDecreasingColor(ChartDrawerConstants.CANDEL_DECREASE);//跌
                set1.setIncreasingColor(ChartDrawerConstants.CANDEL_INCREASE);//涨
                set1.setIncreasingPaintStyle(Paint.Style.FILL);
                set1.setDecreasingPaintStyle(Paint.Style.FILL);
                set1.setShadowColorSameAsCandle(true);

                dataSets.add(set1); // add the datasets
                CandleData candleData = new CandleData(xVals, dataSets);
                candleData.setValueTextSize(0f);


                // create a dataset and give it a type
                LineDataSet set2 = new LineDataSet(yVals2, "DataSet 2");
                // set the line to be drawn like this "- - - - - -"
                set2.enableDashedLine(10f, 0f, 0f);
                set2.setColor(Color.WHITE);
                set2.setLineWidth(LINE_WIDTH_PRICE);
                set2.setDrawCircles(true);
                set2.setDrawCircleHole(false);
                set2.setCircleColors(circleColors);
                set2.setValueTextSize(0f);
                Drawable drawable = ContextCompat.getDrawable(chart.getContext(), R.drawable.stock_price_fill_color);
                set2.setFillDrawable(drawable);
                set2.setDrawFilled(true);
                ArrayList<ILineDataSet> dataSets2 = new ArrayList<ILineDataSet>();
                dataSets2.add(set2);
                LineData lineData = new LineData(xVals, dataSets2);

                CombinedData data = new CombinedData(xVals);
                float zoom = getZoomValue(xVals.size());
                if (mChartType == ChartDrawerConstants.CHART_TYPE.month || mChartType == ChartDrawerConstants.CHART_TYPE.fiveM) {
                    data.setData(candleData);
                    chart.fitScreen();
                    chart.zoom(zoom, 1.0f, xVals.size() * zoom, 0f);
                    chart.moveViewToX(xVals.size()*zoom);
                } else {
                    data.setData(lineData);
                    chart.zoom(1/chart.getScaleX(), 1.0f, 0f, 0f);

                }

                // set data
                chart.clear();
                chart.getXAxis().removeAllLimitLines();
//                if (mChartType == CHART_TYPE.tenM) {
//                    chart.getXAxis().setLabelsToSkip(TEN_MINUTE_POINT_NUMBER);
//                } else {
                chart.getXAxis().setLabelsToSkip(chartDataList.length());
//                }
                chart.getXAxis().setValueFormatter(new XAxisValueFormatter() {
                    @Override
                    public String getXValue(String original, int index, ViewPortHandler viewPortHandler) {
                        return "";
                    }
                });
                chart.getAxisLeft().removeAllLimitLines();
                chart.getAxisRight().removeAllLimitLines();
                chart.getAxisLeft().setAxisMinValue(minVal);
                chart.getAxisLeft().setAxisMaxValue(maxVal);
                chart.setData(data);


                // Set the xAxis with the prev close price line
                if (mChartType == ChartDrawerConstants.CHART_TYPE.today /*|| mChartType == CHART_TYPE.tenM */) {
                    LimitLine line = new LimitLine((float) stockInfoObject.getDouble("preClose"));
                    line.setLineColor(ChartDrawerConstants.CHART_LINE_COLOR);
                    line.setLineWidth(LINE_WIDTH);
                    line.enableDashedLine(10f, 10f, 0f);
                    line.setTextSize(0f);
                    chart.getAxisLeft().addLimitLine(line);
                }

                // Set the yAxis lines with 1 hour in between.
                int gapLineUnit = Calendar.HOUR_OF_DAY;
                int gapLineUnitAddMount = 1;
                if (mChartType == ChartDrawerConstants.CHART_TYPE.today) {
                    gapLineUnit = Calendar.HOUR_OF_DAY;
                }
//                else if (mChartType == CHART_TYPE.tenM) {
//                    gapLineUnit = Calendar.MINUTE;
//                    gapLineUnitAddMount = 2;
//                }
                else if (mChartType == ChartDrawerConstants.CHART_TYPE.twoH) {
                    gapLineUnit = Calendar.MINUTE;
                    gapLineUnitAddMount = 30;
                } else if (mChartType == ChartDrawerConstants.CHART_TYPE.week) {
                    gapLineUnit = Calendar.DAY_OF_MONTH;
                } else if (mChartType == ChartDrawerConstants.CHART_TYPE.month) {
                    gapLineUnit = Calendar.WEEK_OF_MONTH;
                } else if (mChartType == ChartDrawerConstants.CHART_TYPE.fiveM) {
                    gapLineUnit = Calendar.MINUTE;
                    gapLineUnitAddMount = 60;
                }
                Calendar nextLineAt = null;
                if (mChartType == ChartDrawerConstants.CHART_TYPE.week) {
                    Calendar lastOpen = timeStringToCalendar(stockInfoObject.getString("lastOpen"));
                    Calendar firstDataDate = timeStringToCalendar(chartDataList.getJSONObject(0).getString("time"));
                    nextLineAt = (Calendar) firstDataDate.clone();
                    nextLineAt.set(Calendar.HOUR_OF_DAY, lastOpen.get(Calendar.HOUR_OF_DAY));
                    nextLineAt.set(Calendar.MINUTE, lastOpen.get(Calendar.MINUTE));
                    nextLineAt.set(Calendar.MILLISECOND, lastOpen.get(Calendar.MILLISECOND));

                    nextLineAt.add(gapLineUnit, 1);
                } else if (mChartType == ChartDrawerConstants.CHART_TYPE.month) {
                    nextLineAt = timeStringToCalendar(chartDataList.getJSONObject(0).getString("time"));

                    nextLineAt.set(Calendar.DAY_OF_WEEK, Calendar.SUNDAY);
                    nextLineAt.set(Calendar.HOUR_OF_DAY, 8);
                    nextLineAt.set(Calendar.MINUTE, 0);
                    nextLineAt.set(Calendar.MILLISECOND, 0);

                    nextLineAt.add(gapLineUnit, 1);
                }

                ArrayList<Integer> limitLineAt = new ArrayList<>();
                ArrayList<Calendar> limitLineCalender = new ArrayList<>();
                if (chartDataList.length() > 0) {

//                    if (mChartType == CHART_TYPE.tenM) {
//                        Calendar firstDate = timeStringToCalendar(chartDataList.getJSONObject(0).getString("time"));
//                        Calendar lastDate = timeStringToCalendar(chartDataList.getJSONObject(chartDataList.length() - 1).getString("time"));
//                        long distance = (lastDate.getTimeInMillis() - firstDate.getTimeInMillis()) / 1000;
//
//                        if (distance > TEN_MINUTE_POINT_NUMBER) {
//                            firstDate.add(Calendar.MILLISECOND, (int) (1000 * (distance - TEN_MINUTE_POINT_NUMBER)));
//                        }
//
//                        int firstLine = 0;
//                        limitLineAt.add(firstLine);
//                        limitLineCalender.add(firstDate);
//
//                        nextLineAt = (Calendar) firstDate.clone();
//                        nextLineAt.add(gapLineUnit, gapLineUnitAddMount);
//
//                        for (int i = 0; i < chartDataList.length(); i++) {
//                            Calendar calendar = timeStringToCalendar(chartDataList.getJSONObject(i).getString("time"));
//
//                            if (nextLineAt == null) {
//                                calendar.add(gapLineUnit, gapLineUnitAddMount);
//                                nextLineAt = calendar;
//                            } else if (calendar.after(nextLineAt)) {
//
//                                while (calendar.after(nextLineAt)) {
//                                    nextLineAt.add(gapLineUnit, gapLineUnitAddMount);
//                                }
//
//                                long distToStart = (calendar.getTimeInMillis() - firstDate.getTimeInMillis()) / 1000;
//
//                                limitLineAt.add((int) distToStart);
//                                limitLineCalender.add(calendar);
//                            }
//                        }
//
//                    } else {

                    String TIME = isCandleChart()?"Time":"time";

                    int firstLine = 0;
                    limitLineAt.add(firstLine);
                    limitLineCalender.add(timeStringToCalendar(chartDataList.getJSONObject(firstLine).getString(TIME)));

                    for (int i = 0; i < chartDataList.length(); i++) {
                        Calendar calendar = timeStringToCalendar(chartDataList.getJSONObject(i).getString(TIME));

                        if (nextLineAt == null) {
                            calendar.add(gapLineUnit, gapLineUnitAddMount);
                            nextLineAt = calendar;
                        } else if (calendar.after(nextLineAt)) {

                            while (calendar.after(nextLineAt)) {
                                nextLineAt.add(gapLineUnit, gapLineUnitAddMount);
                            }

                            limitLineAt.add(i);
                            limitLineCalender.add(calendar);
                        }
                    }

                    if (mChartType != ChartDrawerConstants.CHART_TYPE.week || !stockInfoObject.getBoolean("isOpen")) {
                        int lastLine = chartDataList.length() - 1;
                        limitLineAt.add(lastLine);
                        limitLineCalender.add(timeStringToCalendar(chartDataList.getJSONObject(lastLine).getString(TIME)));
                    }
//                    }

                    boolean needSkipLabel = false;
                    if (limitLineAt.size() > 10) {//如果竖线密度太大，竖线条数大于10，则隔一个隐藏一个gapLine.setLable("");
                        needSkipLabel = true;
                    }

                    SimpleDateFormat format = new SimpleDateFormat("HH:mm");
                    if (mChartType == ChartDrawerConstants.CHART_TYPE.week || mChartType == ChartDrawerConstants.CHART_TYPE.month) {
                        format = new SimpleDateFormat("MM/dd");
                    }

                    for (int i = 0; i < limitLineAt.size(); i++) {
                        int index = limitLineAt.get(i);
                        Calendar calendar = limitLineCalender.get(i);

                        LimitLine gapLine = new LimitLine(index);
                        gapLine.setLineColor(ChartDrawerConstants.CHART_LINE_COLOR);
                        gapLine.setLineWidth(LINE_WIDTH);
                        gapLine.enableDashedLine(10f, 0f, 0f);
                        gapLine.setTextSize(8f);
                        gapLine.setTextColor(ChartDrawerConstants.CHART_TEXT_COLOR);
                        if (needSkipLabel && i < limitLineAt.size() - 1 && i % 2 == 1) {
                            gapLine.setLabel("");
                        } else {
                            gapLine.setLabel(format.format(calendar.getTime()));
                        }
                        gapLine.setLabelPosition(LimitLine.LimitLabelPosition.BELOW_BOTTOM);

                        chart.getXAxis().addLimitLine(gapLine);
                    }
                }

//                chart.setVisibleXRangeMaximum(600);
//                chart.moveViewToX(0);
                chart.notifyDataSetChanged();

            } catch (JSONException e) {
                e.printStackTrace();
            }
        }
    }

    @ReactProp(name = "colorType")
    public void setColorType(ReactChart chart, int type) {
        if (type == 1) {
            ChartDrawerConstants.CHART_BORDER_COLOR = Color.WHITE;
            ChartDrawerConstants.CHART_LINE_COLOR = Color.WHITE;
        }
    }

    @ReactProp(name = "chartType")
    public void setChartType(ReactChart chart, String type) {
        ChartDrawerConstants.CHART_TYPE[] allType = ChartDrawerConstants.CHART_TYPE.values();
        for (int i = 0; i < allType.length; i++) {
            if (allType[i].getName().equals(type)) {
                mChartType = allType[i];
                break;
            }
        }
    }

    @ReactProp(name = "description")
    public void setDescription(ReactChart chart, String description) {
        if (chart != null) {
            chart.setDescription(description);
        }
    }

    @ReactProp(name = "noDataText")
    public void setNoDataText(ReactChart chart, String text) {
        if (chart != null) {
            chart.setNoDataText(text);
        }
    }

    @ReactProp(name = "noDataTextDescription")
    public void setNoDataTextDescription(ReactChart chart, String description) {
        if (chart != null) {
            if (description != null) {
                chart.setNoDataTextDescription(description);
            }
        }
    }

    @ReactProp(name = "padding", defaultFloat = 0.0f)
    public void setPadding(ReactChart chart, float padding) {
        if (chart != null) {
            chart.setMinOffset(padding);
        }
    }

    @ReactProp(name = "xAxisPosition")
    public void setXAxisPosition(ReactChart chart, String position) {
        if (chart != null) {
            chart.getXAxis().setPosition(XAxis.XAxisPosition.valueOf(position));
        }
    }

    @ReactProp(name = "xAxisStep", defaultInt = 1)
    public void setXAxisStep(ReactChart chart, int step) {
        if (chart != null) {
            chart.getXAxis().setLabelsToSkip(step - 1);
        }
    }

    @ReactProp(name = "xAxisTextSize", defaultFloat = 10.0f)
    public void setXAxisTextSize(ReactChart chart, float size) {
        if (chart != null) {
            chart.getXAxis().setTextSize(size);
        }
    }

    @ReactProp(name = "xAxisDrawLabel")
    public void setXAxisDrawLabel(ReactChart chart, boolean drawEnabled) {
        if (chart != null) {
            chart.getXAxis().setDrawLabels(drawEnabled);
        }
    }

    @ReactProp(name = "leftAxisEnabled", defaultBoolean = true)
    public void setLeftAxisEnabled(ReactChart chart, boolean enabled) {
        if (chart != null) {
            chart.getAxisLeft().setEnabled(enabled);
        }
    }

    @ReactProp(name = "leftAxisMaxValue")
    public void setLeftAxisMaxValue(ReactChart chart, float value) {
        if (chart != null) {
            chart.getAxisLeft().setAxisMaxValue(value);
        }
    }

    @ReactProp(name = "leftAxisMinValue")
    public void setLeftAxisMinValue(ReactChart chart, float value) {
        if (chart != null) {
            chart.getAxisLeft().setAxisMinValue(value);
        }
    }

    @ReactProp(name = "leftAxisPosition")
    public void setLeftAxisPosition(ReactChart chart, String position) {
        if (chart != null) {
            chart.getAxisLeft().setPosition(YAxis.YAxisLabelPosition.valueOf(position));
        }
    }

    @ReactProp(name = "leftAxisLabelCount")
    public void setLeftAxisLabelCount(ReactChart chart, int num) {
        if (chart != null) {
            chart.getAxisLeft().setLabelCount(num, true);
        }
    }

    @ReactProp(name = "leftAxisTextSize", defaultFloat = 10.0f)
    public void setLeftAxisTextSize(ReactChart chart, float size) {
        if (chart != null) {
            chart.getAxisLeft().setTextSize(size);
        }
    }

    @ReactProp(name = "leftAxisDrawLabel")
    public void setLeftAxisDrawLabel(ReactChart chart, boolean drawEnabled) {
        if (chart != null) {
            chart.getAxisLeft().setDrawLabels(drawEnabled);
        }
    }

    @ReactProp(name = "leftAxisLimitLines")
    public void setLeftAxisLimitLines(ReactChart chart, ReadableArray lines) {
        if (chart != null) {
            for (int i = 0; i < lines.size(); i++) {
                LimitLine line = new LimitLine(lines.getInt(i));
                line.setLineColor(Color.GRAY);
                line.setLineWidth(0.5f);
                line.enableDashedLine(10f, 0f, 0f);
                line.setTextSize(0f);

                chart.getAxisLeft().addLimitLine(line);
            }
        }
    }

    @ReactProp(name = "rightAxisEnabled", defaultBoolean = true)
    public void setRightAxisEnabled(ReactChart chart, boolean enabled) {
        if (chart != null) {
            chart.getAxisRight().setEnabled(enabled);
        }
    }

    @ReactProp(name = "rightAxisMaxValue")
    public void setRightAxisMaxValue(ReactChart chart, float value) {
        if (chart != null) {
            chart.getAxisRight().setAxisMaxValue(value);
        }
    }

    @ReactProp(name = "rightAxisMinValue")
    public void setRightAxisMinValue(ReactChart chart, float value) {
        if (chart != null) {
            chart.getAxisRight().setAxisMinValue(value);
        }
    }

    @ReactProp(name = "rightAxisPosition")
    public void setRightAxisPosition(ReactChart chart, String position) {
        if (chart != null) {
            chart.getAxisRight().setPosition(YAxis.YAxisLabelPosition.valueOf(position));
        }
    }

    @ReactProp(name = "rightAxisLabelCount")
    public void setRightAxisLabelCount(ReactChart chart, int num) {
        if (chart != null) {
            chart.getAxisRight().setLabelCount(num, true);
        }
    }

    @ReactProp(name = "rightAxisTextSize", defaultFloat = 10.0f)
    public void setRightAxisTextSize(ReactChart chart, float size) {
        if (chart != null) {
            chart.getAxisRight().setTextSize(size);
        }
    }

    @ReactProp(name = "rightAxisDrawLabel")
    public void setRightAxisDrawLabel(ReactChart chart, boolean drawEnabled) {
        if (chart != null) {
            chart.getAxisRight().setDrawLabels(drawEnabled);
        }
    }

    @Override
    public String getName() {
        return REACT_CLASS;
    }


    private static Calendar timeStringToCalendar(String timeStr) {
        Calendar calendar = GregorianCalendar.getInstance();
        String s = timeStr.replace("Z", "+00:00");
        try {
            int lastColonPos = s.lastIndexOf(":");
            s = s.substring(0, lastColonPos) + s.substring(lastColonPos + 1);
            SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssZ");

            if (s.indexOf(".") > 0) {
                format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ");
            }

            Date date = format.parse(s);
            calendar.setTime(date);

        } catch (IndexOutOfBoundsException e) {
            e.printStackTrace();
        } catch (ParseException e) {
            e.printStackTrace();
        }

        return calendar;
    }


    private static int SIZE_IN_SCREEN = 36;

    private static float getZoomValue(float length) {

        float SW = MainActivity.SCREEN_W;
        SIZE_IN_SCREEN = (int)((SW - 12*2)/10);

        float zoom = 1.0f;
        if (length < SIZE_IN_SCREEN) {
            zoom = 1.0f;
        } else {
            zoom = length / SIZE_IN_SCREEN;
        }
        Log.d("", "getZoomValue: length = " + length + " size = " + SIZE_IN_SCREEN + " zoom = " + zoom);
        return zoom;
    }

    private boolean isCandleChart(){
        return mChartType == ChartDrawerConstants.CHART_TYPE.fiveM || mChartType == ChartDrawerConstants.CHART_TYPE.month;
    }
}

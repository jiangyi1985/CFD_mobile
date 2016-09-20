package com.tradehero.cfd.views.chartDrawer;

import com.tradehero.cfd.views.chartDrawer.base.CandleChartDrawer;
import com.tradehero.cfd.views.chartDrawer.base.ChartDrawerConstants;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;

/**
 * Created by Neko on 16/9/19.
 */
public class FiveMCandleChartDrawer extends CandleChartDrawer {
    @Override
    public boolean needDrawPreCloseLine() {
        return true;
    }

    @Override
    public int getGapLineUnit() {
        return Calendar.HOUR;
    }

    @Override
    public int getLablesToSkip(JSONArray chartDataList) {
       return ChartDrawerConstants.FIVE_MINUTE_POINT_NUMBER;
    }

    @Override
    public boolean needDrawEndLine(JSONObject stockInfoObject) throws JSONException {
        return !stockInfoObject.getBoolean("isOpen");
    }

    @Override
    protected LimitLineInfo calculateLimitLinesPosition(Calendar startUpLine, JSONObject stockInfoObject, JSONArray chartDataList) throws JSONException {
        ArrayList<Integer> limitLineAt = new ArrayList<>();
        ArrayList<Calendar> limitLineCalender = new ArrayList<>();

        //Only return the hour.
        for(int i = 0; i < chartDataList.length(); i ++) {
            //TODO: use "time" if api returns it instead of Uppercase one.
            Calendar calendar = timeStringToCalendar(chartDataList.getJSONObject(i).getString("Time"));
            if (calendar.getTime().getMinutes() == 0){
                limitLineAt.add(i);
                limitLineCalender.add(calendar);
            }
        }

        LimitLineInfo limitLineInfo = new LimitLineInfo();
        limitLineInfo.limitLineAt = limitLineAt;
        limitLineInfo.limitLineCalender = limitLineCalender;
        return limitLineInfo;
    }
}
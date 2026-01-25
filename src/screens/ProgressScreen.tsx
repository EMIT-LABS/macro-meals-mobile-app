import { FontAwesome5 } from '@expo/vector-icons';
import { useMixpanel } from '@macro-meals/mixpanel/src';
import { usePosthog } from '@macro-meals/posthog_service/src';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MacroLegend from 'src/components/MacroLegend';
import MacroTableSection from 'src/components/MacroTableSection';
import VictoryStackedBarChart from 'src/components/VictoryStackedBarChart';
import { useProgressStore } from 'src/store/useProgressStore';

const macroColors = {
  calories: '#ffffff',
  carbs: '#FFC008',
  fat: '#E283E0',
  protein: '#7E54D9',
};

const dateRanges = [
  { label: '1w', value: '1w' },
  { label: '1m', value: '1m' },
  { label: '3m', value: '3m' },
  { label: '6m', value: '6m' },
  { label: '1y', value: '1y' },
];

interface MacroBarData {
  day: number;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  date: string;
  period_label: string;
}

const ProgressScreen = () => {
  const { data, loading, selectedRange, setSelectedRange, fetchDataByPeriod } =
    useProgressStore();
  const [refreshing, setRefreshing] = useState(false);
  const mixpanel = useMixpanel();
    const posthog = usePosthog();


  useEffect(() => {
    console.log(`ProgressScreen: Fetching data for period: ${selectedRange}`);
    fetchDataByPeriod(selectedRange);
  }, [selectedRange, fetchDataByPeriod]);

  const onRefresh = useCallback(async () => {
    console.log(`ProgressScreen: Refreshing data for period: ${selectedRange}`);
    setRefreshing(true);
    await fetchDataByPeriod(selectedRange);
    setRefreshing(false);
  }, [fetchDataByPeriod, selectedRange]);

  useEffect(() => {
    if (data && macroBarData.length > 0) {
      mixpanel?.track({
        name: 'progression_screen_viewed',
        properties: {
          entry_point: 'app_tab',
          default_period: selectedRange,
          start_date: data?.start_date,
          end_date: data?.end_date,
          chart_points_count: macroBarData.length,
        },
      });
      posthog?.track({
        name: 'progression_screen_viewed',
        properties: {
          entry_point: 'app_tab',
          default_period: selectedRange,
          start_date: data?.start_date,
          end_date: data?.end_date,
          chart_points_count: macroBarData.length,
        },
      });
    }
  }, [data, selectedRange]);
  // Process real API data only - no dummy data fallback
  let macroBarData: MacroBarData[] = [];
  let hasNonZeroData = false;

  try {
    if (
      data &&
      Array.isArray(data.period_macros) &&
      data.period_macros.length > 0
    ) {
      macroBarData = data.period_macros.map((periodData, index) => {
        return {
          day: index + 1, // Use index + 1 for chart positioning
          protein: Number(periodData.protein) || 0,
          carbs: Number(periodData.carbs) || 0,
          fat: Number(periodData.fat) || 0,
          calories: Number(periodData.calories) || 0,
          date: periodData.date,
          period_label: periodData.period_label,
        };
      });

      // Check if we have any non-zero values
      hasNonZeroData = macroBarData.some(
        day =>
          day.protein > 0 || day.carbs > 0 || day.fat > 0 || day.calories > 0
      );

      // Debug logging
      console.log(
        'ProgressScreen: Processed macroBarData:',
        macroBarData.map(d => ({
          date: d.date,
          period_label: d.period_label,
          day: d.day,
          protein: d.protein,
          carbs: d.carbs,
          fat: d.fat,
          calories: d.calories,
        }))
      );
    }
  } catch (err) {
    mixpanel?.track({
      name: 'progress_data_fetch_failed',
      properties: {
        error_type: 'server',
        period: selectedRange,
        start_date: data?.start_date,
        end_date: data?.end_date,
      },
    });
      posthog?.track({
      name: 'progress_data_fetch_failed',
      properties: {
        error_type: 'server',
        period: selectedRange,
        start_date: data?.start_date,
        end_date: data?.end_date,
      },
    });
    console.error('Error processing macro data:', err);
    macroBarData = [];
  }

  const avgCalories = data?.average_macros?.calories
    ? Math.round(Number(data.average_macros.calories))
    : 0;

  const avg = data?.average_macros
    ? {
        protein: Math.round(Number(data.average_macros.protein)) || 0,
        carbs: Math.round(Number(data.average_macros.carbs)) || 0,
        fat: Math.round(Number(data.average_macros.fat)) || 0,
      }
    : { protein: 0, carbs: 0, fat: 0 };

  const goal = data?.target_macros
    ? {
        protein: Math.round(Number(data.target_macros.protein)) || 0,
        carbs: Math.round(Number(data.target_macros.carbs)) || 0,
        fat: Math.round(Number(data.target_macros.fat)) || 0,
      }
    : { protein: 0, carbs: 0, fat: 0 };

  // Format date range for display
  let dateRange = '';
  if (data?.start_date && data?.end_date) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    dateRange = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }
  useEffect(() => {
    if (!loading && hasNonZeroData && macroBarData.length > 0) {
      mixpanel?.track({
        name: 'progress_chart_rendered',
        properties: {
          period: selectedRange,
          start_date: data?.start_date,
          end_date: data?.end_date,
          chart_points_count: macroBarData.length,
          total_days_covered: macroBarData.length,
          data_source: 'local',
        },
      });
        posthog?.track({
        name: 'progress_chart_rendered',
        properties: {
          period: selectedRange,
          start_date: data?.start_date,
          end_date: data?.end_date,
          chart_points_count: macroBarData.length,
          total_days_covered: macroBarData.length,
          data_source: 'local',
        },
      });
    }
  }, [loading, hasNonZeroData, macroBarData.length, selectedRange, data]);
  useEffect(() => {
    if (!loading && !hasNonZeroData && data) {
      mixpanel?.track({
        name: 'progress_chart_empty_state_shown',
        properties: {
          period: selectedRange,
          start_date: data?.start_date,
          end_date: data?.end_date,
        },
      });
      posthog?.track({
        name: 'progress_chart_empty_state_shown',
        properties: {
          period: selectedRange,
          start_date: data?.start_date,
          end_date: data?.end_date,
        },
      });
    }
  }, [loading, hasNonZeroData, selectedRange, data]);

  return (
    <ScrollView
      className="bg-white"
      contentContainerStyle={{ paddingBottom: 56 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#fff"
          colors={['#fff']}
        />
      }
    >
      <View className="bg-primaryLight pb-8">
        <Text
          className={`text-white text-xl font-bold text-center px-5 ${Platform.OS === 'ios' ? 'mt-16' : 'mt-[0px]'}`}
        >
          Progress
        </Text>
        <View className="px-12">
          <MacroLegend macroColors={macroColors} small />
        </View>
        <View className="pl-5 mt-4 mb-6">
          <Text className="text-white text-xs font-medium mb-[1px]">
            Avg calories
          </Text>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View className="flex-row items-baseline mt-1">
              <Text className="text-white text-2xl font-semibold mb-[1px]">
                {avgCalories}
              </Text>
              <Text className="text-white text-sm font-medium"> kcal</Text>
            </View>
          )}
          <Text className="text-white text-[10px]">{dateRange}</Text>
        </View>
        <View className="x-5">
          {loading ? (
            <View className="flex-1 h-[250px] my-2 justify-center items-center">
              <ActivityIndicator color="#fff" size="large" />
              <Text className="text-white text-base mt-2">Loading data...</Text>
            </View>
          ) : !hasNonZeroData ? (
            <View className="flex-1 h-[250px] my-2 justify-center items-center">
              <Text className="text-white text-sm text-center">
                No macro data available for this period.{'\n'}Log your meals to
                see your progress!
              </Text>
            </View>
          ) : (
            <VictoryStackedBarChart data={macroBarData} />
          )}
        </View>
        <View className="flex-row justify-center mb-7 px-2">
          {dateRanges.map(r => (
            <TouchableOpacity
              key={r.value}
              onPress={() => {
                mixpanel?.track({
                  name: 'progress_period_selected',
                  properties: {
                    from_period: selectedRange,
                    to_period: r.value,
                    start_date: data?.start_date,
                    end_date: data?.end_date,
                    chart_points_count: macroBarData.length,
                  },
                });
                posthog?.track({
                  name: 'progress_period_selected',
                  properties: {
                    from_period: selectedRange,
                    to_period: r.value,
                    start_date: data?.start_date,
                    end_date: data?.end_date,
                    chart_points_count: macroBarData.length,
                  },
                });
                setSelectedRange(r.value);
              }}
              className={`
                px-4 py-1.5 mx-3 rounded-full bg-white
                ${selectedRange === r.value ? 'opacity-100' : 'opacity-70'}
              `}
              activeOpacity={0.8}
            >
              <Text className="text-black text-xs font-semibold">
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overlapping Cards */}
        <View className="absolute bottom-[-40px] left-0 right-0">
          <View
            className="flex-row px-4"
            style={{ transform: [{ translateY: 50 }] }}
          >
            <View className="flex-1 bg-[#C4E7E3] mx-1 rounded-2xl items-center py-6 shadow-lg">
              <View
                className="w-12 h-12 rounded-full justify-center items-center mb-3"
                style={{ backgroundColor: '#253238' }}
              >
                <FontAwesome5 name="trophy" size={22} color="white" />
              </View>
              <Text
                allowFontScaling={false}
                className="text-sm text-black text-center"
              >
                {data?.target_macros?.calories || '-'} cal
              </Text>
              <Text
                allowFontScaling={false}
                className="text-xs opacity-65 text-black text-center"
              >
                Net goal
              </Text>
            </View>

            <View className="flex-1 bg-[#C4E7E3] mx-1 rounded-2xl items-center py-6 shadow-lg">
              <View
                className="w-12 h-12 rounded-full justify-center items-center mb-3"
                style={{ backgroundColor: '#253238' }}
              >
                <FontAwesome5 name="fire" size={22} color="white" />
              </View>
              <Text
                allowFontScaling={false}
                className="text-sm text-black text-center"
              >
                {avgCalories} cal
              </Text>
              <Text
                allowFontScaling={false}
                className="text-xs opacity-65 text-black text-center"
              >
                Net daily avg.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="mt-[80px]">
        <MacroTableSection avg={avg} goal={goal} />
      </View>
    </ScrollView>
  );
};

export default ProgressScreen;

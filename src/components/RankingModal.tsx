import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  cleanNickname,
  Entry,
  fetchTop,
  getNickname,
  getPlayerId,
  NICK_MAX,
  Period,
  RANKING_ENABLED,
  saveNickname,
} from '../ranking/ranking';
import { LCD, MONO, THEME } from '../theme';

type Props = { visible: boolean; onClose: () => void; onNickname: (nick: string) => void };

export function RankingModal({ visible, onClose, onNickname }: Props) {
  const [period, setPeriod] = useState<Period>('week');
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [nick, setNick] = useState('');
  const [me, setMe] = useState('');

  useEffect(() => {
    if (!visible) return;
    getNickname().then(setNick);
    getPlayerId().then(setMe);
  }, [visible]);

  const load = useCallback(async (p: Period) => {
    setLoading(true);
    setError(false);
    try {
      setRows(await fetchTop(p));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible && RANKING_ENABLED) load(period);
  }, [visible, period, load]);

  const commitNick = async () => {
    const saved = await saveNickname(nick);
    setNick(saved);
    onNickname(saved);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>RANKING</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar">
              <Text style={styles.close}>X</Text>
            </Pressable>
          </View>

          {!RANKING_ENABLED ? (
            <Text style={styles.msg}>Ranking indisponivel nesta versao.</Text>
          ) : (
            <>
              <Text style={styles.label}>SEU APELIDO</Text>
              <View style={styles.nickRow}>
                <TextInput
                  value={nick}
                  onChangeText={(t) => setNick(cleanNickname(t.slice(0, NICK_MAX + 4)))}
                  onEndEditing={commitNick}
                  onSubmitEditing={commitNick}
                  maxLength={NICK_MAX}
                  placeholder="Escolha um apelido"
                  placeholderTextColor={THEME.bezelText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>

              <View style={styles.tabs}>
                {(['week', 'all'] as Period[]).map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setPeriod(p)}
                    style={[styles.tab, period === p && styles.tabOn]}
                  >
                    <Text style={[styles.tabText, period === p && styles.tabTextOn]}>
                      {p === 'week' ? 'SEMANA' : 'GERAL'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {loading && <ActivityIndicator color={LCD.pale} style={{ marginTop: 16 }} />}
              {error && !loading && (
                <Pressable onPress={() => load(period)}>
                  <Text style={styles.msg}>Sem conexao. Toque para tentar de novo.</Text>
                </Pressable>
              )}
              {!loading && !error && rows.length === 0 && (
                <Text style={styles.msg}>Ninguem pontuou ainda. Seja o primeiro!</Text>
              )}

              <FlatList
                data={rows}
                keyExtractor={(r) => r.player_id}
                renderItem={({ item, index }) => (
                  <View style={[styles.row, item.player_id === me && styles.rowMe]}>
                    <Text style={styles.pos}>{index + 1}</Text>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.nickname}
                    </Text>
                    <Text style={styles.score}>{item.score}</Text>
                  </View>
                )}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: THEME.bezel,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    height: '78%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: THEME.button, fontFamily: MONO, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  close: { color: THEME.bezelText, fontFamily: MONO, fontSize: 20, fontWeight: '900' },
  label: { color: THEME.bezelText, fontFamily: MONO, fontSize: 11, marginTop: 14, letterSpacing: 1 },
  nickRow: { marginTop: 6 },
  input: {
    backgroundColor: LCD.pale,
    color: LCD.dark,
    fontFamily: MONO,
    fontSize: 16,
    fontWeight: '700',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 6 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: LCD.mid },
  tabOn: { backgroundColor: LCD.pale },
  tabText: { color: LCD.pale, fontFamily: MONO, fontSize: 12, fontWeight: '800' },
  tabTextOn: { color: LCD.dark },
  msg: { color: THEME.bezelText, fontFamily: MONO, fontSize: 13, marginTop: 16, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 6 },
  rowMe: { backgroundColor: 'rgba(155,188,15,0.18)' },
  pos: { width: 32, color: THEME.button, fontFamily: MONO, fontWeight: '900', fontSize: 14 },
  name: { flex: 1, color: '#fff', fontFamily: MONO, fontSize: 14, fontWeight: '700' },
  score: { color: LCD.pale, fontFamily: MONO, fontSize: 14, fontWeight: '900' },
});

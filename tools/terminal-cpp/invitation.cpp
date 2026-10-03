// invitation.cpp — invitation.conf 를 읽어 터미널에 청첩장을 출력하는 C++ 버전.
//
//   빌드:  g++ -std=c++17 -O2 -o invitation invitation.cpp      (또는 make)
//   실행:  ./invitation                       (../../static/invitation.conf 를 읽음)
//          ./invitation 내설정.conf --accounts   계좌번호까지 출력
//          ./invitation --no-color               색 없이 출력
//
// 웹 청첩장(main·developer·release)과 같은 invitation.conf 를 씁니다. 값을 따로 고칠 필요가 없습니다.
// 웹 페이지가 아니라 터미널에 출력하는 작은 보너스 도구입니다.
// Windows 콘솔에서는 먼저 `chcp 65001` 로 UTF-8 로 바꾸세요.

#include <algorithm>
#include <cstdio>
#include <cstdlib>
#include <ctime>
#include <fstream>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>

using Conf = std::map<std::string, std::string>;

static bool g_color = true;
static std::string paint(const char* code, const std::string& s) {
    return g_color ? std::string("\033[") + code + "m" + s + "\033[0m" : s;
}
static std::string trim(const std::string& s) {
    size_t a = s.find_first_not_of(" \t\r\n"), b = s.find_last_not_of(" \t\r\n");
    return a == std::string::npos ? "" : s.substr(a, b - a + 1);
}
static std::string replace_all(std::string s, const std::string& from, const std::string& to) {
    for (size_t p = 0; (p = s.find(from, p)) != std::string::npos; p += to.size()) s.replace(p, from.size(), to);
    return s;
}

// KEY="value" 형식을 읽습니다. 값 안의 \n 은 줄바꿈으로 바꿉니다.
static Conf load_conf(const std::string& path) {
    std::ifstream in(path);
    if (!in) { std::cerr << "설정 파일을 열 수 없습니다: " << path << "\n"; std::exit(1); }
    Conf c; std::string line;
    while (std::getline(in, line)) {
        line = trim(line);
        if (line.empty() || line[0] == '#') continue;
        size_t eq = line.find('=');
        if (eq == std::string::npos) continue;
        std::string key = trim(line.substr(0, eq)), val = trim(line.substr(eq + 1));
        if (val.size() >= 1 && val.front() == '"') val.erase(0, 1);
        if (val.size() >= 1 && val.back() == '"') val.pop_back();
        c[key] = replace_all(val, "\\n", "\n");
    }
    return c;
}
static std::string get(const Conf& c, const std::string& k) {
    auto it = c.find(k); return it == c.end() ? "" : it->second;
}
static std::vector<std::string> split(const std::string& s, char d) {
    std::vector<std::string> out; std::string cur; std::stringstream ss(s);
    while (std::getline(ss, cur, d)) out.push_back(trim(cur));
    return out;
}

// 날짜 계산: 1970-01-01 기준 일수 (Howard Hinnant 의 civil 알고리즘)
static long days_from_civil(int y, int m, int d) {
    y -= m <= 2; long era = (y >= 0 ? y : y - 399) / 400; unsigned yoe = (unsigned)(y - era * 400);
    unsigned doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
    unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    return era * 146097 + (long)doe - 719468;
}
static long today_days() {
    std::time_t t = std::time(nullptr); std::tm* lt = std::localtime(&t);
    return days_from_civil(lt->tm_year + 1900, lt->tm_mon + 1, lt->tm_mday);
}
static std::string ko_time(int h, int mi) {
    std::string t = h == 12 ? "낮 12시" : h < 12 ? "오전 " + std::to_string(h) + "시" : "오후 " + std::to_string(h - 12) + "시";
    return mi ? t + " " + std::to_string(mi) + "분" : t;
}
static std::string bar(double pct, int width = 30) {
    int n = (int)(pct / 100.0 * width + 0.5); n = std::max(0, std::min(width, n));
    std::string s; for (int i = 0; i < width; i++) s += i < n ? "█" : "░";
    return s;
}

int main(int argc, char** argv) {
    std::string path = "../../static/invitation.conf"; bool accounts = false;
    for (int i = 1; i < argc; i++) {
        std::string a = argv[i];
        if (a == "--no-color") g_color = false;
        else if (a == "--accounts") accounts = true;
        else path = a;
    }
    Conf c = load_conf(path);
    const char* WD[] = {"일", "월", "화", "수", "목", "금", "토"};
    const std::string bl = paint("2", "│ ");
    auto line = [&](const std::string& s = "") { std::cout << bl << s << "\n"; };
    auto multi = [&](const std::string& s, const char* color = nullptr) {
        for (auto& l : split(s, '\n')) line(color ? paint(color, l) : l);
    };

    std::string g = get(c, "GROOM_NAME"), b = get(c, "BRIDE_NAME");
    std::cout << paint("2", "┌──────────────────────────────────────────────\n");
    line(paint("31", "$ ") + "./invite --groom \"" + g + "\" --bride \"" + b + "\"");
    std::cout << paint("2", "├──────────────────────────────────────────────\n");
    line();
    line(paint("1", "  " + g) + paint("31", "  ♥  ") + paint("1", b));
    std::string en = get(c, "GROOM_NAME_EN"), ben = get(c, "BRIDE_NAME_EN");
    if (!en.empty() || !ben.empty()) line(paint("2", "  " + en + "  &  " + ben));
    line();

    // 혼주
    for (int side = 0; side < 2; side++) {
        std::string p = side ? "BRIDE_" : "GROOM_";
        std::string f = get(c, p + "FATHER"), m = get(c, p + "MOTHER"), r = get(c, p + "RANK"), n = side ? b : g;
        std::string parents = f.empty() ? m : m.empty() ? f : f + " · " + m;
        line(paint("2", std::string("// ") + (side ? "bride" : "groom")));
        line("  " + (parents.empty() ? "" : parents + "의 ") + (r.empty() ? "" : r + " ") + paint("1", n));
    }
    line();

    // 일시 + D-day + 진행률
    int Y = 0, M = 0, D = 0, h = 0, mi = 0;
    std::string wat = get(c, "WEDDING_AT");
    bool ok = std::sscanf(wat.c_str(), "%d-%d-%dT%d:%d", &Y, &M, &D, &h, &mi) >= 3;
    line(paint("34", "const ") + "wedding = {");
    if (ok) {
        long wd = days_from_civil(Y, M, D); int dow = (int)(((wd % 7) + 11) % 7);   // 1970-01-01 은 목요일
        char buf[64]; std::snprintf(buf, sizeof buf, "%04d-%02d-%02d", Y, M, D);
        line("  date:  " + paint("32", std::string("\"") + buf + "\"") + "," + paint("2", std::string("   // ") + WD[dow] + "요일"));
        std::snprintf(buf, sizeof buf, "%02d:%02d", h, mi);
        line("  time:  " + paint("32", std::string("\"") + buf + "\"") + "," + paint("2", "   // " + ko_time(h, mi)));
    } else {
        line("  date:  " + paint("32", "\"[예식 일시]\"") + ",");
    }
    line("  venue: " + paint("32", "\"" + get(c, "VENUE_NAME") + " " + get(c, "VENUE_HALL") + "\"") + ",");
    line("};");
    if (ok) {
        long left = days_from_civil(Y, M, D) - today_days();
        line();
        line(paint("2", "$ uptime --until wedding"));
        line("  " + (left > 0 ? paint("1;31", "D-" + std::to_string(left)) : left == 0 ? paint("1;31", "D-Day") : paint("1", "함께해 주셔서 감사합니다")));
        int my = 0, mm = 0, md = 0;
        if (std::sscanf(get(c, "FIRST_MET_AT").c_str(), "%d-%d-%d", &my, &mm, &md) == 3) {
            long met = days_from_civil(my, mm, md), wdn = days_from_civil(Y, M, D), now = today_days();
            double pct = wdn > met ? std::max(0.0, std::min(100.0, 100.0 * (now - met) / (wdn - met))) : 0.0;
            char pb[32]; std::snprintf(pb, sizeof pb, "%.1f%%", pct);
            line();
            line(paint("2", "$ ./loading --wedding"));
            line("  " + paint("31", bar(pct)) + " " + pb);
            line(paint("2", "  우리가 만난 지 " + std::to_string(now - met) + "일"));
        }
    }
    line();
    line(paint("2", "// directions"));
    line("  " + get(c, "VENUE_ADDRESS"));
    const char* keys[][2] = {{"subway", "INFO_SUBWAY"}, {"bus", "INFO_BUS"}, {"parking", "INFO_PARKING"}, {"meal", "INFO_MEAL"}};
    for (auto& k : keys) {
        std::string v = get(c, k[1]); if (v.empty()) continue;
        auto ls = split(v, '\n');
        for (size_t i = 0; i < ls.size(); i++) line("  " + (i == 0 ? paint("34", std::string(k[0]) + ":") + " " : std::string("         ")) + ls[i]);
    }

    if (accounts) {
        line();
        line(paint("2", "// accounts"));
        for (const char* key : {"GROOM_ACCOUNTS", "BRIDE_ACCOUNTS"})
            for (auto& item : split(get(c, key), ',')) {
                auto p = split(item, '|');
                if (p.size() >= 4) line("  " + p[0] + "  " + paint("1", p[1]) + "  " + p[2] + " " + p[3]);
            }
    }

    line();
    line(paint("31", "$ ") + paint("34", "git") + " commit -m");
    multi(get(c, "CLOSING_TEXT"), "32");
    std::cout << paint("2", "└──────────────────────────────────────────────\n");
    return 0;
}
